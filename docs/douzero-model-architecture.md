# DouZero 模型架构分析

> 本文档分析 DouZero 模型的输入输出格式，为 ONNX 转换做准备。

## 1. 输入编码

### 1.1 输入张量概览

DouZero 模型接收两个输入：

| 输入名称 | 形状 | 数据类型 | 说明 |
|---------|------|---------|------|
| `z` | `[batch_size, 5, 162]` | float32 | 历史动作序列 (LSTM 输入) |
| `x` | `[batch_size, 373或484]` | float32 | 当前状态特征 |

- **Landlord 模型**: `x` 维度为 373
- **Farmer 模型**: `x` 维度为 484

### 1.2 卡牌编码方式 (_cards2array)

所有 54 张牌编码为 54 维向量：

```
[52维矩阵 + 2维大小王]

矩阵部分 (52维):
  - 形状: [4, 13] 按 F (Fortran) 顺序展平
  - 4 行: 表示每张牌的数量 (1-4张)
  - 13 列: 表示牌的点数 (3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2)
  - 编码: [0,0,0,0] = 0张, [1,0,0,0] = 1张, ..., [1,1,1,1] = 4张

大小王部分 (2维):
  - 索引 52: 小王 (X, 值=20)
  - 索引 53: 大王 (D, 值=30)

牌值映射:
  Card2Column = {
    3: 0, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6,
    10: 7, 11: 8, 12: 9, 13: 10, 14: 11, 17: 12
  }
  (3-14对应3-A, 17对应2)
```

**示例编码**:
```python
输入: [3, 3, 4, 20]  # 两张3，一张4，一张小王
输出: [1,1,0,0, 1,0,0,0, 0,0,0,0, ..., 1,0]  # 54维
       ↑---↑  ↑---↑                  ↑--↑
       两张3  一张4                  小王
```

### 1.3 历史动作编码 (z 输入)

将最近 15 个动作编码为 `[5, 162]` 矩阵：

```
流程:
1. 取最近 15 个动作 (不足时前补零)
2. 每个动作编码为 54 维向量
3. reshape 为 [5, 162]
   - 162 = 54 × 3 (每 3 个动作合并为一行)
   - 这是因为斗地主中 3 个玩家一轮

代码逻辑:
def _action_seq_list2array(action_seq_list):
    action_seq_array = np.zeros((len(action_seq_list), 54))
    for row, list_cards in enumerate(action_seq_list):
        action_seq_array[row, :] = _cards2array(list_cards)
    action_seq_array = action_seq_array.reshape(5, 162)
    return action_seq_array
```

### 1.4 Landlord 输入特征 (x)

**维度**: 373 = 319 + 54

| 特征名称 | 维度 | 说明 |
|---------|-----|------|
| `my_handcards` | 54 | 地主手牌 |
| `other_handcards` | 54 | 农民手牌(联合) |
| `last_action` | 54 | 最近一次出牌 |
| `landlord_up_played_cards` | 54 | 上家已出牌 |
| `landlord_down_played_cards` | 54 | 下家已出牌 |
| `landlord_up_num_cards_left` | 17 | 上家剩余牌数(One-hot) |
| `landlord_down_num_cards_left` | 17 | 下家剩余牌数(One-hot) |
| `bomb_num` | 15 | 炸弹数量(One-hot) |
| `my_action` | 54 | 候选动作 |

**总计**: 54×6 + 17 + 17 + 15 = 373

### 1.5 Farmer 输入特征 (x)

**维度**: 484 = 430 + 54

| 特征名称 | 维度 | 说明 |
|---------|-----|------|
| `my_handcards` | 54 | 农民手牌 |
| `other_handcards` | 54 | 其他玩家手牌(地主+队友) |
| `landlord_played_cards` | 54 | 地主已出牌 |
| `teammate_played_cards` | 54 | 队友已出牌 |
| `last_action` | 54 | 最近一次出牌 |
| `last_landlord_action` | 54 | 地主最近出牌 |
| `last_teammate_action` | 54 | 队友最近出牌 |
| `landlord_num_cards_left` | 20 | 地主剩余牌数(One-hot) |
| `teammate_num_cards_left` | 17 | 队友剩余牌数(One-hot) |
| `bomb_num` | 15 | 炸弹数量(One-hot) |
| `my_action` | 54 | 候选动作 |

**总计**: 54×8 + 20 + 17 + 15 = 484

### 1.6 批处理机制

模型采用特殊的批处理方式：

```python
num_legal_actions = len(infoset.legal_actions)  # 合法动作数量

# 为每个候选动作创建一个样本
x_batch = np.hstack([
    my_handcards_batch,        # [num_legal_actions, 54]
    other_handcards_batch,     # [num_legal_actions, 54]
    ...,
    my_action_batch            # [num_legal_actions, 54] - 每行不同
])

z_batch = np.repeat(z[np.newaxis, :, :], num_legal_actions, axis=0)
# z_batch: [num_legal_actions, 5, 162]
```

**关键点**: `x_batch` 的每个样本对应一个候选动作，模型输出该动作的 Q 值。

## 2. 网络结构

### 2.1 LandlordLstmModel

```
输入:
  z: [batch_size, 5, 162]
  x: [batch_size, 373]

网络结构:
  LSTM(162, 128, batch_first=True)
  → 取最后时间步输出 [batch_size, 128]
  → 拼接 x [batch_size, 128+373=501]
  → Dense1(501, 512) + ReLU
  → Dense2(512, 512) + ReLU
  → Dense3(512, 512) + ReLU
  → Dense4(512, 512) + ReLU
  → Dense5(512, 512) + ReLU
  → Dense6(512, 1)

输出:
  values: [batch_size, 1] (Q值)
```

### 2.2 FarmerLstmModel

```
输入:
  z: [batch_size, 5, 162]
  x: [batch_size, 484]

网络结构:
  LSTM(162, 128, batch_first=True)
  → 取最后时间步输出 [batch_size, 128]
  → 拼接 x [batch_size, 128+484=612]
  → Dense1(612, 512) + ReLU
  → Dense2(512, 512) + ReLU
  → Dense3(512, 512) + ReLU
  → Dense4(512, 512) + ReLU
  → Dense5(512, 512) + ReLU
  → Dense6(512, 1)

输出:
  values: [batch_size, 1] (Q值)
```

### 2.3 模型参数统计

| 模型 | 参数数量 |
|-----|---------|
| LandlordLstmModel | ~1.09M |
| FarmerLstmModel | ~1.12M |

## 3. 输出解码

### 3.1 输出张量

| 输出名称 | 形状 | 含义 |
|---------|------|------|
| `values` | `[batch_size, 1]` | 每个候选动作的 Q 值 |

### 3.2 动作选择

```python
def forward(self, z, x, return_value=False, flags=None):
    # ... 网络前向传播 ...
    x = self.dense6(x)  # [batch_size, 1]

    if return_value:
        return dict(values=x)
    else:
        if flags is not None and flags.exp_epsilon > 0 and np.random.rand() < flags.exp_epsilon:
            action = torch.randint(x.shape[0], (1,))[0]  # epsilon-greedy 探索
        else:
            action = torch.argmax(x, dim=0)[0]  # 选择 Q 值最大的动作
        return dict(action=action)
```

### 3.3 动作空间

**重要**: 动作空间是动态的，不是固定 27472！

```python
# 动作空间大小取决于当前局面
num_legal_actions = len(infoset.legal_actions)  # 可能是几十到几百

# legal_actions 是具体的牌型列表
# 例如: [[3,3,3,4,4,4], [5,5], [], ...]
#       三带三对    对子   不出

# 选择动作
action_idx = argmax(Q_values)  # 选择 Q 值最大的索引
action = legal_actions[action_idx]  # 映射到具体牌型
```

### 3.4 牌型类型

斗地主包含 15 种牌型（定义在 `move_detector.py`）:

| 类型编号 | 名称 | 示例 |
|---------|------|------|
| 0 | Pass | [] |
| 1 | 单张 | [3] |
| 2 | 对子 | [3,3] |
| 3 | 三张 | [3,3,3] |
| 4 | 炸弹 | [3,3,3,3] |
| 5 | 王炸 | [20,30] |
| 6 | 三带一 | [3,3,3,4] |
| 7 | 三带二 | [3,3,3,4,4] |
| 8 | 顺子 | [3,4,5,6,7] |
| 9 | 连对 | [3,3,4,4,5,5] |
| 10 | 飞机 | [3,3,3,4,4,4] |
| 11 | 飞机带单 | [3,3,3,4,4,4,5,6] |
| 12 | 飞机带对 | [3,3,3,4,4,4,5,5,6,6] |
| 13 | 四带二单 | [3,3,3,3,4,5] |
| 14 | 四带二对 | [3,3,3,3,4,4,5,5] |

## 4. ONNX 转换建议

### 4.1 需要注意的问题

#### 4.1.1 动态 batch size
```python
# 批大小等于合法动作数量，是动态的
batch_size = len(legal_actions)  # 可能是 1 到几百
```

#### 4.1.2 LSTM 初始状态
```python
# PyTorch LSTM 默认 h_0 和 c_0 为零向量
# ONNX 导出时需要显式提供
h_0 = torch.zeros(1, batch_size, 128)
c_0 = torch.zeros(1, batch_size, 128)
```

#### 4.1.3 动作选择逻辑
```python
# 训练时包含 epsilon-greedy 探索
# 推理时应移除，直接使用 argmax
```

#### 4.1.4 数据类型
```python
# 输入数据类型
z: torch.float32  # 不是 int8！
x: torch.float32
```

### 4.2 转换脚本示例

```python
import torch
from douzero.dmc.models import LandlordLstmModel, FarmerLstmModel

def export_to_onnx(model_type='landlord', output_path='model.onnx'):
    """
    将 DouZero 模型导出为 ONNX 格式

    Args:
        model_type: 'landlord', 'landlord_up', 或 'landlord_down'
        output_path: 输出 ONNX 文件路径
    """
    # 创建模型
    if model_type == 'landlord':
        model = LandlordLstmModel()
        x_dim = 373
    else:
        model = FarmerLstmModel()
        x_dim = 484

    model.eval()

    # 创建示例输入
    batch_size = 10  # 假设有 10 个合法动作
    z = torch.randn(batch_size, 5, 162)
    x = torch.randn(batch_size, x_dim)

    # 导出 ONNX
    torch.onnx.export(
        model,
        (z, x),
        output_path,
        input_names=['z', 'x'],
        output_names=['values'],
        dynamic_axes={
            'z': {0: 'batch_size'},
            'x': {0: 'batch_size'},
            'values': {0: 'batch_size'}
        },
        opset_version=11,
        do_constant_folding=True
    )

    print(f"模型已导出到: {output_path}")

# 使用示例
export_to_onnx('landlord', 'landlord_model.onnx')
export_to_onnx('landlord_up', 'farmer_up_model.onnx')
export_to_onnx('landlord_down', 'farmer_down_model.onnx')
```

### 4.3 ONNX 推理示例

```python
import numpy as np
import onnxruntime as ort

class DouZeroONNX:
    def __init__(self, landlord_model_path, farmer_model_path):
        self.landlord_session = ort.InferenceSession(landlord_model_path)
        self.farmer_session = ort.InferenceSession(farmer_model_path)

    def predict(self, position, z, x):
        """
        预测每个候选动作的 Q 值

        Args:
            position: 'landlord', 'landlord_up', 或 'landlord_down'
            z: 历史动作 [num_actions, 5, 162]
            x: 状态特征 [num_actions, 373或484]

        Returns:
            values: Q值数组 [num_actions, 1]
        """
        if position == 'landlord':
            session = self.landlord_session
        else:
            session = self.farmer_session

        inputs = {
            'z': z.astype(np.float32),
            'x': x.astype(np.float32)
        }

        outputs = session.run(None, inputs)
        return outputs[0]  # [num_actions, 1]

    def select_action(self, position, z, x, legal_actions):
        """
        选择最优动作

        Args:
            position: 玩家位置
            z: 历史动作编码
            x: 状态特征 (已包含候选动作)
            legal_actions: 合法动作列表

        Returns:
            action: 最优动作 (牌型列表)
        """
        values = self.predict(position, z, x)
        action_idx = np.argmax(values)
        return legal_actions[action_idx]
```

### 4.4 完整的输入编码示例

```python
import numpy as np
from collections import Counter

# 卡牌编码函数
Card2Column = {
    3: 0, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6,
    10: 7, 11: 8, 12: 9, 13: 10, 14: 11, 17: 12
}

NumOnes2Array = {
    0: np.array([0, 0, 0, 0]),
    1: np.array([1, 0, 0, 0]),
    2: np.array([1, 1, 0, 0]),
    3: np.array([1, 1, 1, 0]),
    4: np.array([1, 1, 1, 1])
}

def cards2array(list_cards):
    """将牌列表编码为54维向量"""
    if len(list_cards) == 0:
        return np.zeros(54, dtype=np.int8)

    matrix = np.zeros([4, 13], dtype=np.int8)
    jokers = np.zeros(2, dtype=np.int8)

    counter = Counter(list_cards)
    for card, num_times in counter.items():
        if card < 20:
            matrix[:, Card2Column[card]] = NumOnes2Array[num_times]
        elif card == 20:
            jokers[0] = 1
        elif card == 30:
            jokers[1] = 1

    return np.concatenate((matrix.flatten('F'), jokers))

def encode_action_seq(action_seq_list, length=15):
    """编码历史动作序列为 [5, 162] 矩阵"""
    # 填充到指定长度
    sequence = action_seq_list[-length:].copy()
    if len(sequence) < length:
        empty_sequence = [[] for _ in range(length - len(sequence))]
        empty_sequence.extend(sequence)
        sequence = empty_sequence

    # 编码每个动作
    action_seq_array = np.zeros((len(sequence), 54))
    for row, list_cards in enumerate(sequence):
        action_seq_array[row, :] = cards2array(list_cards)

    # Reshape 为 [5, 162]
    action_seq_array = action_seq_array.reshape(5, 162)
    return action_seq_array

def encode_landlord_obs(infoset):
    """编码地主观察"""
    num_legal_actions = len(infoset.legal_actions)

    # 基础特征 (不含动作)
    my_handcards = cards2array(infoset.player_hand_cards)
    other_handcards = cards2array(infoset.other_hand_cards)
    last_action = cards2array(infoset.last_move)
    landlord_up_played = cards2array(infoset.played_cards['landlord_up'])
    landlord_down_played = cards2array(infoset.played_cards['landlord_down'])
    landlord_up_num_left = get_one_hot_array(infoset.num_cards_left_dict['landlord_up'], 17)
    landlord_down_num_left = get_one_hot_array(infoset.num_cards_left_dict['landlord_down'], 17)
    bomb_num = get_one_hot_bomb(infoset.bomb_num)

    # 批处理编码
    my_handcards_batch = np.repeat(my_handcards[np.newaxis, :], num_legal_actions, axis=0)
    other_handcards_batch = np.repeat(other_handcards[np.newaxis, :], num_legal_actions, axis=0)
    last_action_batch = np.repeat(last_action[np.newaxis, :], num_legal_actions, axis=0)
    landlord_up_played_batch = np.repeat(landlord_up_played[np.newaxis, :], num_legal_actions, axis=0)
    landlord_down_played_batch = np.repeat(landlord_down_played[np.newaxis, :], num_legal_actions, axis=0)
    landlord_up_num_left_batch = np.repeat(landlord_up_num_left[np.newaxis, :], num_legal_actions, axis=0)
    landlord_down_num_left_batch = np.repeat(landlord_down_num_left[np.newaxis, :], num_legal_actions, axis=0)
    bomb_num_batch = np.repeat(bomb_num[np.newaxis, :], num_legal_actions, axis=0)

    # 编码候选动作
    my_action_batch = np.zeros((num_legal_actions, 54))
    for j, action in enumerate(infoset.legal_actions):
        my_action_batch[j, :] = cards2array(action)

    # 拼接 x_batch
    x_batch = np.hstack([
        my_handcards_batch,
        other_handcards_batch,
        last_action_batch,
        landlord_up_played_batch,
        landlord_down_played_batch,
        landlord_up_num_left_batch,
        landlord_down_num_left_batch,
        bomb_num_batch,
        my_action_batch
    ])

    # 编码历史动作
    z = encode_action_seq(infoset.card_play_action_seq)
    z_batch = np.repeat(z[np.newaxis, :, :], num_legal_actions, axis=0)

    return {
        'x_batch': x_batch.astype(np.float32),
        'z_batch': z_batch.astype(np.float32),
        'legal_actions': infoset.legal_actions
    }
```

## 5. 参考资源

- **论文**: [DouZero: Mastering DouDizhu with Self-Play Deep Reinforcement Learning](https://arxiv.org/pdf/2106.06135.pdf)
- **代码仓库**: [https://github.com/kwai/DouZero](https://github.com/kwai/DouZero)
- **关键文件**:
  - `douzero/dmc/models.py` - 模型定义
  - `douzero/env/env.py` - 状态编码
  - `douzero/env/game.py` - 游戏环境
  - `douzero/dmc/utils.py` - 训练工具

## 6. 常见问题

### Q1: 动作空间大小是固定的 27472 吗？

**A**: 不是。27472 是所有可能牌型的理论总数，但实际动作空间是动态的：
- 每个局面只有几十到几百个合法动作
- 合法动作由 `legal_actions` 列表给出
- 模型输出的 Q 值数量等于 `len(legal_actions)`

### Q2: 为什么需要为每个候选动作创建一个样本？

**A**: DouZero 采用 Deep Counterfactual Regret Minimization (Deep CFR) 思想：
- 对每个候选动作单独评估其 Q 值
- 选择 Q 值最大的动作
- 这种设计简化了模型输出，只需要输出单个值

### Q3: LSTM 的隐藏状态如何初始化？

**A**: PyTorch LSTM 默认使用零向量初始化：
```python
h_0 = torch.zeros(num_layers, batch_size, hidden_size)
c_0 = torch.zeros(num_layers, batch_size, hidden_size)
```

### Q4: ONNX 转换后如何处理动态 batch size？

**A**: 使用 `dynamic_axes` 参数：
```python
torch.onnx.export(
    ...,
    dynamic_axes={
        'z': {0: 'batch_size'},
        'x': {0: 'batch_size'},
        'values': {0: 'batch_size'}
    }
)
```

### Q5: 如何处理不同位置的不同输入维度？

**A**: 需要为三个位置训练三个独立的模型：
- `landlord_model.onnx` - 输入维度 373
- `landlord_up_model.onnx` - 输入维度 484
- `landlord_down_model.onnx` - 输入维度 484