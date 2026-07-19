#!/usr/bin/env python3
"""
将 ONNX 模型转换为 TensorFlow.js 格式

转换流程：
1. ONNX → TensorFlow SavedModel (使用 onnx-tf)
2. TensorFlow SavedModel → TensorFlow.js (需要后续使用 tensorflowjs_converter)

使用方法：
python convert_onnx_to_tfjs.py --input_dir ../public/models/douzero --output_dir ../public/models/douzero_tfjs
"""

import argparse
import os
import sys
from pathlib import Path

try:
    import onnx
    from onnx_tf.backend import prepare
except ImportError:
    print("错误: 请先安装依赖: pip install onnx onnx-tf tensorflow")
    sys.exit(1)

try:
    import tensorflow as tf
except ImportError:
    print("警告: TensorFlow 未安装，将只生成 SavedModel")
    print("安装命令: pip install tensorflow")
    tf = None


def convert_onnx_to_savedmodel(onnx_path: str, output_dir: str) -> bool:
    """
    将 ONNX 模型转换为 TensorFlow SavedModel 格式
    
    Args:
        onnx_path: ONNX 模型文件路径
        output_dir: SavedModel 输出目录
    
    Returns:
        是否成功
    """
    print(f"\n转换: {onnx_path}")
    print(f"输出: {output_dir}")
    
    try:
        # 加载 ONNX 模型
        print("  [1/3] 加载 ONNX 模型...")
        onnx_model = onnx.load(onnx_path)
        
        # 验证模型
        print("  [2/3] 验证模型...")
        onnx.checker.check_model(onnx_model)
        
        # 转换为 TensorFlow
        print("  [3/3] 转换为 TensorFlow SavedModel...")
        tf_rep = prepare(onnx_model)
        
        # 导出为 SavedModel 格式
        os.makedirs(output_dir, exist_ok=True)
        tf_rep.export_graph(output_dir)
        
        print(f"  ✓ 转换成功: {output_dir}")
        return True
        
    except Exception as e:
        print(f"  ✗ 转换失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description="ONNX 转 TensorFlow SavedModel")
    parser.add_argument(
        "--input_dir",
        type=str,
        default="../public/models/douzero",
        help="ONNX 模型目录"
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="../public/models/douzero_savedmodel",
        help="SavedModel 输出目录"
    )
    
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    
    if not input_dir.exists():
        print(f"错误: 输入目录不存在: {input_dir}")
        sys.exit(1)
    
    # 查找所有 .onnx 文件
    onnx_files = list(input_dir.glob("*.onnx"))
    
    if not onnx_files:
        print(f"错误: 未找到 ONNX 文件: {input_dir}")
        sys.exit(1)
    
    print(f"找到 {len(onnx_files)} 个 ONNX 文件")
    
    success_count = 0
    for onnx_file in onnx_files:
        model_name = onnx_file.stem
        savedmodel_path = output_dir / model_name
        
        if convert_onnx_to_savedmodel(str(onnx_file), str(savedmodel_path)):
            success_count += 1
    
    print(f"\n{'='*60}")
    print(f"转换完成: {success_count}/{len(onnx_files)} 成功")
    print(f"{'='*60}")
    
    if success_count < len(onnx_files):
        sys.exit(1)
    
    # 提示下一步操作
    print(f"\n下一步：将 SavedModel 转换为 TensorFlow.js 格式")
    print(f"运行命令:")
    print(f"  npm install -g @tensorflow/tfjs-converter")
    print(f"  tensorflowjs_converter --input_format=tf_saved_model \\")
    print(f"    --output_format=tfjs_graph_model \\")
    print(f"    {output_dir}/landlord {output_dir}_tfjs/landlord")
    print(f"  # 对其他模型重复相同操作...")


if __name__ == "__main__":
    main()