#!/usr/bin/env python3
"""
导出 DouZero PyTorch 权重为浏览器 TensorFlow.js 可加载的格式。

仅依赖 torch（本机 scripts/venv 即可），不需要 TensorFlow / Docker。

输出目录: public/models/tfjs/{landlord,landlord_up,landlord_down}/
  - manifest.json  权重清单
  - weights.bin    按清单顺序拼接的 float32 小端权重

前端用 tf.layers 重建网络后 setWeights 加载。
"""

from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

import torch

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CKPT_DIR = PROJECT_ROOT / "baselines" / "douzero_WP"
OUT_ROOT = PROJECT_ROOT / "public" / "models" / "tfjs"


def load_torch_state(ckpt_path: Path) -> dict:
    raw = torch.load(str(ckpt_path), map_location="cpu", weights_only=False)
    if isinstance(raw, dict):
        if "model" in raw and isinstance(raw["model"], dict):
            state = raw["model"]
        elif "state_dict" in raw:
            state = raw["state_dict"]
        else:
            # 可能整个 dict 就是 state_dict
            sample = next(iter(raw.values()))
            if hasattr(sample, "shape"):
                state = raw
            else:
                state = raw.get("model", raw)
    else:
        state = raw

    cleaned = {}
    for key, value in state.items():
        if not hasattr(value, "detach"):
            continue
        if key.startswith("module."):
            key = key[7:]
        cleaned[key] = value
    return cleaned


def pack_weights(state: dict, is_landlord: bool) -> tuple[list[dict], bytes]:
    """
    按 TFJS Layers 期望顺序打包:
      lstm: kernel[I,4H], recurrent[H,4H], bias[4H]
      dense1..dense5, values: kernel[in,out], bias[out]
    PyTorch Linear/LSTM → 转置到 Keras/TFJS 布局。
    """
    entries: list[dict] = []
    blobs: list[bytes] = []

    def add(name: str, arr) -> None:
        flat = arr.detach().cpu().contiguous().view(-1).numpy().astype("float32")
        entries.append({"name": name, "shape": list(arr.shape), "dtype": "float32"})
        blobs.append(flat.tobytes())

    # LSTM: PyTorch [4H, I] / [4H, H] → Keras [I, 4H] / [H, 4H]
    w_ih = state["lstm.weight_ih_l0"]  # [512, 162]
    w_hh = state["lstm.weight_hh_l0"]  # [512, 128]
    b_ih = state["lstm.bias_ih_l0"]
    b_hh = state["lstm.bias_hh_l0"]

    add("lstm/kernel", w_ih.T.contiguous())
    add("lstm/recurrent_kernel", w_hh.T.contiguous())
    add("lstm/bias", (b_ih + b_hh).contiguous())

    for i in range(1, 6):
        w = state[f"dense{i}.weight"]  # [out, in]
        b = state[f"dense{i}.bias"]
        add(f"dense{i}/kernel", w.T.contiguous())
        add(f"dense{i}/bias", b.contiguous())

    w = state["dense6.weight"]
    b = state["dense6.bias"]
    add("values/kernel", w.T.contiguous())
    add("values/bias", b.contiguous())

    x_dim = 373 if is_landlord else 484
    manifest = {
        "format": "douzero-tfjs-weights-v1",
        "xDim": x_dim,
        "zShape": [5, 162],
        "lstmUnits": 128,
        "weights": entries,
    }
    return manifest, b"".join(blobs)


def export_one(model_name: str, ckpt_name: str, is_landlord: bool) -> None:
    ckpt_path = CKPT_DIR / ckpt_name
    if not ckpt_path.exists():
        raise FileNotFoundError(ckpt_path)

    print(f"\n=== 导出 {model_name} ===")
    print(f"  ckpt: {ckpt_path}")

    state = load_torch_state(ckpt_path)
    required = [
        "lstm.weight_ih_l0",
        "lstm.weight_hh_l0",
        "lstm.bias_ih_l0",
        "lstm.bias_hh_l0",
        *[f"dense{i}.weight" for i in range(1, 7)],
        *[f"dense{i}.bias" for i in range(1, 7)],
    ]
    missing = [k for k in required if k not in state]
    if missing:
        raise KeyError(f"{model_name} 缺少权重: {missing[:5]}... keys={list(state.keys())[:10]}")

    manifest, blob = pack_weights(state, is_landlord)
    out_dir = OUT_ROOT / model_name
    out_dir.mkdir(parents=True, exist_ok=True)

    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (out_dir / "weights.bin").write_bytes(blob)

    # 兼容旧路径：同时写一个 model.json 标记，方便排查
    meta = {
        "modelTopology": {"class_name": "DouZeroCustom", "config": {"name": model_name}},
        "format": "douzero-tfjs-weights-v1",
        "generatedBy": "scripts/export_douzero_tfjs_weights.py",
        "xDim": manifest["xDim"],
        "weightsManifest": [
            {
                "paths": ["weights.bin"],
                "weights": [
                    {"name": w["name"], "shape": w["shape"], "dtype": "float32"}
                    for w in manifest["weights"]
                ],
            }
        ],
    }
    (out_dir / "model.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"  weights: {len(manifest['weights'])} tensors, {len(blob)/1024/1024:.2f} MB")
    print(f"  ✓ {out_dir}")


def main() -> None:
    print("=" * 60)
    print("DouZero → TFJS 权重导出（纯 PyTorch）")
    print("=" * 60)
    print(f"Torch: {torch.__version__}")
    print(f"输入: {CKPT_DIR}")
    print(f"输出: {OUT_ROOT}")

    if not CKPT_DIR.exists():
        print(f"✗ 找不到 {CKPT_DIR}")
        sys.exit(1)

    jobs = [
        ("landlord", "landlord.ckpt", True),
        ("landlord_up", "landlord_up.ckpt", False),
        ("landlord_down", "landlord_down.ckpt", False),
    ]
    for name, ckpt, is_ll in jobs:
        export_one(name, ckpt, is_ll)

    print("\n✓ 全部导出完成")


if __name__ == "__main__":
    main()
