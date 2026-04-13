import requests
import json

def test_naming_api():
    url = "http://localhost:3000/api/name/generate-v2"
    
    # 测试用例1: 完整描述文本
    print("测试用例1: 完整描述文本")
    payload1 = {
        "rawInput": "女孩，姓张，2025年3月15日出生，希望名字温柔诗意，喜欢水意象"
    }
    
    try:
        response = requests.post(url, json=payload1, timeout=30)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"成功: {data.get('success')}")
            if data.get('success'):
                candidates = data.get('data', {}).get('candidates', [])
                print(f"生成 {len(candidates)} 个候选名字:")
                for i, candidate in enumerate(candidates[:3]):  # 只显示前3个
                    print(f"  {i+1}. {candidate.get('fullName')} ({candidate.get('pinyin')})")
                    print(f"     五行: {candidate.get('wuxing')}, 评分: {candidate.get('score')}")
                    print(f"     含义: {candidate.get('meaning')}")
                    if candidate.get('sources'):
                        source = candidate['sources'][0]
                        print(f"     出处: {source.get('book')} - {source.get('text')[:50]}...")
                    print()
            else:
                print(f"错误: {data.get('error')}")
        else:
            print(f"请求失败: {response.text}")
    except Exception as e:
        print(f"请求异常: {e}")
    
    print("\n" + "="*80 + "\n")
    
    # 测试用例2: 结构化参数
    print("测试用例2: 结构化参数")
    payload2 = {
        "surname": "李",
        "gender": "M",
        "birthDate": "2024-08-20",
        "expectations": "大气阳刚，有志向",
        "style": "古典"
    }
    
    try:
        response = requests.post(url, json=payload2, timeout=30)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"成功: {data.get('success')}")
            if data.get('success'):
                candidates = data.get('data', {}).get('candidates', [])
                print(f"生成 {len(candidates)} 个候选名字:")
                for i, candidate in enumerate(candidates[:3]):
                    print(f"  {i+1}. {candidate.get('fullName')} ({candidate.get('pinyin')})")
                    print(f"     五行: {candidate.get('wuxing')}, 评分: {candidate.get('score')}")
        else:
            print(f"请求失败: {response.text}")
    except Exception as e:
        print(f"请求异常: {e}")
    
    print("\n" + "="*80 + "\n")
    
    # 测试用例3: 简单输入
    print("测试用例3: 简单输入")
    payload3 = {
        "surname": "王",
        "gender": "F",
        "birthDate": "2023-12-05",
        "expectations": "聪明伶俐"
    }
    
    try:
        response = requests.post(url, json=payload3, timeout=30)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"成功: {data.get('success')}")
            if data.get('success'):
                candidates = data.get('data', {}).get('candidates', [])
                print(f"生成 {len(candidates)} 个候选名字:")
                for i, candidate in enumerate(candidates[:3]):
                    print(f"  {i+1}. {candidate.get('fullName')} ({candidate.get('pinyin')})")
        else:
            print(f"请求失败: {response.text}")
    except Exception as e:
        print(f"请求异常: {e}")

if __name__ == "__main__":
    test_naming_api()