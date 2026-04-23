#!/usr/bin/env python3
"""
检查BGE-M3环境
"""

import torch
from transformers import AutoTokenizer, AutoModel

print('=== BGE-M3环境检查 ===')
print(f'PyTorch版本: {torch.__version__}')
print(f'CUDA可用: {torch.cuda.is_available()}')

if torch.cuda.is_available():
    print(f'CUDA设备: {torch.cuda.get_device_name(0)}')
    print(f'GPU内存: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')

print('\n尝试加载BGE-M3 tokenizer...')
try:
    tokenizer = AutoTokenizer.from_pretrained('BAAI/bge-m3')
    print('✓ 成功加载BGE-M3 tokenizer')
    
    # 尝试加载模型
    print('\n尝试加载BGE-M3模型...')
    try:
        model = AutoModel.from_pretrained('BAAI/bge-m3')
        print('✓ 成功加载BGE-M3模型')
        print(f'嵌入维度: {model.config.hidden_size}')
        
        # 检查模型大小
        param_count = sum(p.numel() for p in model.parameters())
        print(f'模型参数数量: {param_count:,}')
        
    except Exception as e:
        print(f'✗ 加载模型失败: {e}')
        
except Exception as e:
    print(f'✗ 加载tokenizer失败: {e}')
    
    # 尝试离线加载
    print('\n尝试检查本地缓存...')
    import os
    cache_paths = [
        os.path.expanduser("~/.cache/huggingface/hub"),
        "C:/Users/Administrator/.cache/huggingface/hub",
        "C:/cache/huggingface"
    ]
    
    for cache_path in cache_paths:
        if os.path.exists(cache_path):
            print(f'找到缓存路径: {cache_path}')
            # 检查是否有BGE-M3模型
            bge_path = os.path.join(cache_path, "models--BAAI--bge-m3")
            if os.path.exists(bge_path):
                print(f'找到BGE-M3缓存: {bge_path}')
                # 列出文件
                for root, dirs, files in os.walk(bge_path):
                    for file in files:
                        if file.endswith('.bin') or file.endswith('.safetensors'):
                            print(f'  模型文件: {file}')

print('\n=== 系统信息 ===')
import platform
print(f'系统: {platform.system()} {platform.release()}')
print(f'Python版本: {platform.python_version()}')

import psutil
print(f'内存总量: {psutil.virtual_memory().total / 1024**3:.1f} GB')
print(f'可用内存: {psutil.virtual_memory().available / 1024**3:.1f} GB')