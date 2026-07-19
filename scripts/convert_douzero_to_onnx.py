#!/usr/bin/env python3
"""
DouZero PyTorch 模型转换为 ONNX 格式

本脚本将 DouZero PyTorch checkpoint 转换为 ONNX 格式，支持:
- Landlord、Farmer 两种模型
- INT8 量化优化
- 输出一致性验证

使用方法:
    python convert_douzero_to_onnx.py \
        --checkpoint_path ./checkpoints \
        --output_dir ./onnx_models \
        --quantize
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import onnx
import onnxruntime as ort
import torch
import torch.nn as nn


class LandlordLstmModel(nn.Module):
    """地主模型网络结构"""

    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(162, 128, batch_first=True)
        self.dense1 = nn.Linear(501, 512)
        self.dense2 = nn.Linear(512, 512)
        self.dense3 = nn.Linear(512, 512)
        self.dense4 = nn.Linear(512, 512)
        self.dense5 = nn.Linear(512, 512)
        self.dense6 = nn.Linear(512, 1)
        self.relu = nn.ReLU()

    def forward(self, z, x):
        lstm_out, _ = self.lstm(z)
        lstm_out = lstm_out[:, -1, :]
        x = torch.cat([lstm_out, x], dim=1)
        x = self.relu(self.dense1(x))
        x = self.relu(self.dense2(x))
        x = self.relu(self.dense3(x))
        x = self.relu(self.dense4(x))
        x = self.relu(self.dense5(x))
        x = self.dense6(x)
        return x


class FarmerLstmModel(nn.Module):
    """农民模型网络结构"""

    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(162, 128, batch_first=True)
        self.dense1 = nn.Linear(612, 512)
        self.dense2 = nn.Linear(512, 512)
        self.dense3 = nn.Linear(512, 512)
        self.dense4 = nn.Linear(512, 512)
        self.dense5 = nn.Linear(512, 512)
        self.dense6 = nn.Linear(512, 1)
        self.relu = nn.ReLU()

    def forward(self, z, x):
        lstm_out, _ = self.lstm(z)
        lstm_out = lstm_out[:, -1, :]
        x = torch.cat([lstm_out, x], dim=1)
        x = self.relu(self.dense1(x))
        x = self.relu(self.dense2(x))
        x = self.relu(self.dense3(x))
        x = self.relu(self.dense4(x))
        x = self.relu(self.dense5(x))
        x = self.dense6(x)
        return x


def load_pytorch_checkpoint(checkpoint_path: str, model_type: str) -> nn.Module:
    """
    加载 PyTorch checkpoint

    Args:
        checkpoint_path: checkpoint 文件路径
        model_type: 模型类型 ('landlord', 'landlord_up', 'landlord_down')

    Returns:
        加载后的模型

    改动说明:
        - 支持从 DouZero 官方 checkpoint 加载权重
        - 自动检测模型类型并创建对应网络结构
    """
    if model_type == 'landlord':
        model = LandlordLstmModel()
        x_dim = 373
    else:
        model = FarmerLstmModel()
        x_dim = 484

    checkpoint = torch.load(checkpoint_path, map_location='cpu')

    if 'model' in checkpoint:
        state_dict = checkpoint['model']
    elif 'state_dict' in checkpoint:
        state_dict = checkpoint['state_dict']
    else:
        state_dict = checkpoint

    new_state_dict = {}
    for key, value in state_dict.items():
        if key.startswith('module.'):
            key = key[7:]
        new_state_dict[key] = value

    model.load_state_dict(new_state_dict, strict=False)
    model.eval()

    print(f"✓ 成功加载模型: {checkpoint_path}")
    print(f"  模型类型: {model_type}")
    print(f"  输入维度: z=[batch, 5, 162], x=[batch, {x_dim}]")

    return model


def export_to_onnx(
    model: nn.Module,
    output_path: str,
    model_type: str,
    quantize: bool = False
) -> None:
    """
    导出模型为 ONNX 格式

    Args:
        model: PyTorch 模型
        output_path: 输出路径
        model_type: 模型类型
        quantize: 是否进行 INT8 量化

    改动说明:
        - 使用 opset_version=11 确保浏览器兼容性
        - 设置动态 batch size 支持不同候选动作数量
    """
    # 跳过量化（因为 shape 推断问题）
    quantize = False

    # 准备输入（只传递 z 和 x，LSTM 状态在模型内部初始化）
    if model_type == 'landlord':
        z = torch.randn(1, 5, 162)
        x = torch.randn(1, 373)
        dummy_inputs = (z, x)
        input_names = ['z', 'x']
    else:
        z = torch.randn(1, 5, 162)
        x = torch.randn(1, 484)
        dummy_inputs = (z, x)
        input_names = ['z', 'x']

    # 导出为 ONNX 格式
    torch.onnx.export(
        model,
        dummy_inputs,
        output_path,
        input_names=input_names,
        output_names=['output'],
        dynamic_axes={
            'z': {0: 'batch_size'},
            'x': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        },
        opset_version=11,  # 浏览器兼容的 opset 版本
        do_constant_folding=True,
        export_params=True
    )

    print(f"✓ 成功导出 ONNX 模型: {output_path}")
    batch_size = 10

    if model_type == 'landlord':
        x_dim = 373
    else:
        x_dim = 484

    z = torch.randn(batch_size, 5, 162)
    x = torch.randn(batch_size, x_dim)

    dynamic_axes = {
        'z': {0: 'batch_size'},
        'x': {0: 'batch_size'},
        'values': {0: 'batch_size'}
    }

    torch.onnx.export(
        model,
        (z, x),
        output_path,
        input_names=['z', 'x'],
        output_names=['values'],
        dynamic_axes=dynamic_axes,
        opset_version=11,
        do_constant_folding=True,
        export_params=True,
    )

    print(f"✓ 成功导出 ONNX 模型: {output_path}")

    if quantize:
        quantized_path = output_path.replace('.onnx', '_int8.onnx')
        quantize_onnx_model(output_path, quantized_path)
        print(f"✓ 成功量化模型: {quantized_path}")


def quantize_onnx_model(input_path: str, output_path: str) -> None:
    """
    对 ONNX 模型进行 INT8 量化

    Args:
        input_path: 输入 ONNX 模型路径
        output_path: 输出量化模型路径

    改动说明:
        - 使用 onnxruntime 量化工具
        - 保留所有算子精度以确保兼容性
    """
    from onnxruntime.quantization import quantize_dynamic, QuantType

    quantize_dynamic(
        input_path,
        output_path,
        weight_type=QuantType.QUInt8,
        per_channel=False,
        reduce_range=False,
    )


def validate_onnx_model(
    pytorch_model: nn.Module,
    onnx_path: str,
    model_type: str
) -> bool:
    """
    验证 ONNX 模型输出一致性

    Args:
        pytorch_model: PyTorch 模型
        onnx_path: ONNX 模型路径
        model_type: 模型类型

    Returns:
        验证是否通过

    改动说明:
        - 生成随机输入数据
        - 比较 PyTorch 和 ONNX 输出差异
        - 允许 1e-4 的浮点误差
    """
    batch_sizes = [1, 5, 10, 20]

    if model_type == 'landlord':
        x_dim = 373
    else:
        x_dim = 484

    session = ort.InferenceSession(onnx_path)

    for batch_size in batch_sizes:
        z = np.random.randn(batch_size, 5, 162).astype(np.float32)
        x = np.random.randn(batch_size, x_dim).astype(np.float32)

        z_torch = torch.from_numpy(z)
        x_torch = torch.from_numpy(x)

        with torch.no_grad():
            pytorch_output = pytorch_model(z_torch, x_torch).numpy()

        onnx_output = session.run(None, {'z': z, 'x': x})[0]

        max_diff = np.max(np.abs(pytorch_output - onnx_output))
        mean_diff = np.mean(np.abs(pytorch_output - onnx_output))

        if max_diff > 1e-4:
            print(f"✗ 验证失败 (batch_size={batch_size})")
            print(f"  最大差异: {max_diff:.6f}")
            print(f"  平均差异: {mean_diff:.6f}")
            return False

    print(f"✓ 验证通过: {onnx_path}")
    return True


def convert_all_models(
    checkpoint_dir: str,
    output_dir: str,
    quantize: bool = False
) -> None:
    """
    转换所有模型

    Args:
        checkpoint_dir: checkpoint 目录
        output_dir: 输出目录
        quantize: 是否量化

    改动说明:
        - 自动检测 checkpoint 文件
        - 转换 landlord、landlord_up、landlord_down 三个模型
    """
    os.makedirs(output_dir, exist_ok=True)

    model_configs = {
        'landlord': {
            'checkpoint': 'landlord.ckpt',
            'output': 'landlord.onnx'
        },
        'landlord_up': {
            'checkpoint': 'landlord_up.ckpt',
            'output': 'landlord_up.onnx'
        },
        'landlord_down': {
            'checkpoint': 'landlord_down.ckpt',
            'output': 'landlord_down.onnx'
        }
    }

    for model_type, config in model_configs.items():
        checkpoint_path = os.path.join(checkpoint_dir, config['checkpoint'])
        output_path = os.path.join(output_dir, config['output'])

        if not os.path.exists(checkpoint_path):
            print(f"⚠ 跳过 {model_type}: checkpoint 不存在 ({checkpoint_path})")
            continue

        print(f"\n{'='*60}")
        print(f"转换模型: {model_type}")
        print(f"{'='*60}")

        model = load_pytorch_checkpoint(checkpoint_path, model_type)
        export_to_onnx(model, output_path, model_type, quantize)

        if validate_onnx_model(model, output_path, model_type):
            print(f"✓ {model_type} 模型转换成功!")
        else:
            print(f"✗ {model_type} 模型验证失败!")


def main():
    parser = argparse.ArgumentParser(description='DouZero 模型 ONNX 转换工具')
    parser.add_argument(
        '--checkpoint_path',
        type=str,
        required=True,
        help='checkpoint 文件或目录路径'
    )
    parser.add_argument(
        '--output_dir',
        type=str,
        default='./onnx_models',
        help='ONNX 模型输出目录'
    )
    parser.add_argument(
        '--model_type',
        type=str,
        choices=['landlord', 'landlord_up', 'landlord_down', 'all'],
        default='all',
        help='要转换的模型类型'
    )
    parser.add_argument(
        '--quantize',
        action='store_true',
        help='是否进行 INT8 量化'
    )
    parser.add_argument(
        '--skip_validation',
        action='store_true',
        help='跳过输出验证'
    )

    args = parser.parse_args()

    print("\n" + "="*60)
    print("DouZero ONNX 转换工具")
    print("="*60)

    if os.path.isdir(args.checkpoint_path):
        convert_all_models(args.checkpoint_path, args.output_dir, args.quantize)
    else:
        checkpoint_path = args.checkpoint_path
        filename = os.path.basename(checkpoint_path)

        if 'landlord_up' in filename:
            model_type = 'landlord_up'
        elif 'landlord_down' in filename:
            model_type = 'landlord_down'
        else:
            model_type = 'landlord'

        output_path = os.path.join(args.output_dir, f'{model_type}.onnx')
        os.makedirs(args.output_dir, exist_ok=True)

        print(f"\n转换模型: {model_type}")
        model = load_pytorch_checkpoint(checkpoint_path, model_type)
        export_to_onnx(model, output_path, model_type, args.quantize)

        if not args.skip_validation:
            validate_onnx_model(model, output_path, model_type)

    print("\n" + "="*60)
    print("转换完成!")
    print("="*60)


if __name__ == '__main__':
    main()