#!/usr/bin/env python3
"""
简化版 ONNX 到 TensorFlow.js 转换脚本

一键转换所有模型，无需复杂的手动操作。

使用方法:
cd scripts
source venv/bin/activate
python convert_onnx_to_tfjs_simple.py

依赖:
pip install onnx onnx-tf tensorflow tensorflowjs
"""

import os
import sys
import subprocess
from pathlib import Path

def check_dependencies():
    """检查必要的依赖"""
    required = ['onnx', 'tensorflow']
    missing = []

    for pkg in required:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)

    if missing:
        print(f"错误: 缺少依赖: {', '.join(missing)}")
        print(f"安装命令: pip install {' '.join(missing)}")
        return False

    return True

def install_tensorflowjs():
    """安装 tensorflowjs"""
    try:
        import tensorflowjs
    except ImportError:
        print("安装 tensorflowjs...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'tensorflowjs'])

def convert_onnx_to_tfjs(onnx_path: Path, output_dir: Path):
    """转换单个模型"""
    import onnx
    from onnx_tf.backend import prepare
    import tensorflow as tf

    model_name = onnx_path.stem
    savedmodel_path = output_dir / 'savedmodel' / model_name
    tfjs_path = output_dir / 'tfjs' / model_name

    print(f"\n{'='*60}")
    print(f"转换模型: {model_name}")
    print(f"{'='*60}")

    try:
        # 1. ONNX → SavedModel
        if not savedmodel_path.exists():
            print(f"[1/2] ONNX → SavedModel...")
            print(f"  加载: {onnx_path}")
            onnx_model = onnx.load(str(onnx_path))
            onnx.checker.check_model(onnx_model)

            print(f"  转换中...")
            tf_rep = prepare(onnx_model)

            print(f"  保存: {savedmodel_path}")
            savedmodel_path.parent.mkdir(parents=True, exist_ok=True)
            tf_rep.export_graph(str(savedmodel_path))
            print(f"  ✓ SavedModel 生成完成")
        else:
            print(f"[1/2] 跳过 ONNX → SavedModel (已存在)")

        # 2. SavedModel → TensorFlow.js
        print(f"[2/2] SavedModel → TensorFlow.js...")
        print(f"  输出: {tfjs_path}")
        tfjs_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            sys.executable, '-m', 'tensorflowjs_converter',
            '--input_format=tf_saved_model',
            '--output_format=tfjs_graph_model',
            str(savedmodel_path),
            str(tfjs_path)
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode == 0:
            print(f"  ✓ TensorFlow.js 模型生成完成")
            print(f"  文件: {tfjs_path}/model.json")

            # 检查文件
            if tfjs_path.joinpath('model.json').exists():
                size = sum(f.stat().st_size for f in tfjs_path.rglob('*') if f.is_file())
                print(f"  大小: {size / 1024 / 1024:.2f} MB")
            return True
        else:
            print(f"  ✗ 转换失败:")
            print(f"  {result.stderr}")
            return False

    except Exception as e:
        print(f"  ✗ 转换失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    # 检查依赖
    if not check_dependencies():
        sys.exit(1)

    # 安装 tensorflowjs
    install_tensorflowjs()

    # 路径设置
    script_dir = Path(__file__).parent
    input_dir = script_dir.parent / 'public' / 'models' / 'douzero'
    output_dir = script_dir.parent / 'public' / 'models'

    print(f"\n配置:")
    print(f"  输入目录: {input_dir}")
    print(f"  输出目录: {output_dir}")

    if not input_dir.exists():
        print(f"错误: 输入目录不存在: {input_dir}")
        sys.exit(1)

    # 查找 ONNX 文件
    onnx_files = list(input_dir.glob('*.onnx'))

    if not onnx_files:
        print(f"错误: 未找到 ONNX 文件")
        sys.exit(1)

    print(f"\n找到 {len(onnx_files)} 个模型:")
    for f in onnx_files:
        print(f"  - {f.name}")

    # 转换所有模型
    success_count = 0
    for onnx_file in onnx_files:
        if convert_onnx_to_tfjs(onnx_file, output_dir):
            success_count += 1

    # 总结
    print(f"\n{'='*60}")
    print(f"转换完成: {success_count}/{len(onnx_files)} 成功")
    print(f"{'='*60}")

    if success_count == len(onnx_files):
        print(f"\n✓ 所有模型已成功转换为 TensorFlow.js 格式")
        print(f"\n模型位置:")
        print(f"  {output_dir / 'tfjs'}")
        print(f"\n使用方法:")
        print(f"  import * as tf from '@tensorflow/tfjs';")
        print(f"  const model = await tf.loadGraphModel('/models/tfjs/landlord/model.json');")
    else:
        print(f"\n部分模型转换失败，请检查错误日志")
        sys.exit(1)

if __name__ == '__main__':
    main()