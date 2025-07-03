import asyncio
import aiohttp
import json
from datetime import datetime
from collections import defaultdict
from pytz import timezone

# 全局缓存品牌分类信息
brand_cache = {}

# 获取品牌类别（带缓存）
async def get_brand_categories(session, brand_id: str) -> list[str]:
    if brand_id in brand_cache:
        return brand_cache[brand_id]

    brand_api_url = f"https://list.szlcsc.com/phone/p/brand/{brand_id}?showOutSockProduct=0&pageSize=1&pageNumber=1"
    for attempt in range(3):
        try:
            async with session.get(brand_api_url, ssl=False) as response:
                if response.status == 200:
                    brand_data = await response.json()
                    categories = [category["label"] for category in
                                  brand_data.get("result", {}).get("searchResult", {}).get("catalogGroup", [])]
                    brand_cache[brand_id] = sorted(categories)
                    return brand_cache[brand_id]
                else:
                    print(f"获取品牌类别失败，状态码：{response.status}")
                    await asyncio.sleep(2 ** attempt)
        except Exception as e:
            print(f"第 {attempt + 1} 次获取品牌类别失败: {e}")
            await asyncio.sleep(2 ** attempt)
    return []

# 解析优惠券详细信息
async def parse_coupon_details(session, coupon_data: dict) -> dict:
    product_categories = await get_brand_categories(session, coupon_data['brandIds'])
    return {
        "coupon_name": coupon_data['couponName'],
        "brand_name": coupon_data['brandNames'],
        "brand_id": coupon_data['brandIds'],
        "activity_name": coupon_data['couponActivityName'],
        "min_order_amount": coupon_data['minOrderMoney'],
        "coupon_amount": coupon_data['couponAmount'],
        "min_order_after_discount": coupon_data['minOrderMoney'] - coupon_data['couponAmount'],
        "receive_customer_num": coupon_data['receiveCustomerNum'],
        "catalog_groups": product_categories
    }

# 解析优惠券简要信息
async def parse_simple_coupon_details(session, coupon_data: dict) -> dict:
    return {
        "coupon_name": coupon_data['couponName'],
        "brand_name": coupon_data['brandNames'],
        "brand_id": coupon_data['brandIds'],
        "min_order_amount": coupon_data['minOrderMoney'],
        "coupon_amount": coupon_data['couponAmount']
    }

# 过滤和分类优惠券
async def filter_and_classify_coupons(session, coupons: dict):
    coupon_map = coupons.get("result", {}).get("CouponModelVOListMap", {})
    classified_coupons = defaultdict(list)
    simple_classified_coupons = {}

    valid_coupons = []
    for category, coupons_list in coupon_map.items():
        if category != "plus":
            for coupon in coupons_list:
                if "<新人专享>" not in coupon["couponName"] and "品牌" in coupon["couponName"]:
                    discount_diff = coupon['minOrderMoney'] - coupon['couponAmount']
                    if discount_diff <= 2:
                        valid_coupons.append(coupon)

    print(f"有效的优惠券：{[i['couponName'] for i in valid_coupons]} ")
    valid_coupons_count = len(valid_coupons)
    print(f"总共需要处理 {valid_coupons_count} 个有效优惠券")

    # 并发解析详细和简单信息
    detail_tasks = [parse_coupon_details(session, coupon) for coupon in valid_coupons]
    simple_tasks = [parse_simple_coupon_details(session, coupon) for coupon in valid_coupons]

    detailed_results = await asyncio.gather(*detail_tasks)
    simple_results = await asyncio.gather(*simple_tasks)

    # 处理详细结果
    for details in detailed_results:
        for group in details["catalog_groups"]:
            classified_coupons[group].append(details)

    # 处理简单结果
    for details in simple_results:
        simple_classified_coupons[details["brand_id"]] = details

    return [dict(classified_coupons), simple_classified_coupons]

# 主函数
async def main():
    url = "https://activity.szlcsc.com/phone/activity/coupon"

    connector = aiohttp.TCPConnector(limit_per_host=5, ssl=False)
    headers = {
        'User-Agent': ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) '
                       'Chrome/127.0.0.0 Safari/538.36 Edg/128.0.0.0')
    }

    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    coupons = await response.json()
                else:
                    print(f"主接口请求失败，状态码：{response.status}")
                    return
        except Exception as e:
            print(f"主接口请求失败: {e}")
            return

        if coupons:
            all_classified_coupons = await filter_and_classify_coupons(session, coupons)
            classified_coupons = all_classified_coupons[0]
            simple_classified_coupons = all_classified_coupons[1]

            # 排序分类结果
            classified_coupons = {k: classified_coupons[k] for k in sorted(classified_coupons)}

            # 写入 JSON 文件
            with open("html/coupon_details.json", "w", encoding="utf-8") as f:
                json.dump(classified_coupons, f, ensure_ascii=False, indent=2)
                print("优惠券信息已保存到 html/coupon_details.json 文件中")

            with open("html/simple_coupon_details.json", "w", encoding="utf-8") as f:
                json.dump(simple_classified_coupons, f, ensure_ascii=False, indent=2)
                print("简洁优惠券信息已保存到 html/simple_coupon_details.json 文件中")

            # 写入运行时间
            with open("html/run_time.txt", "w") as f:
                china_tz = timezone('Asia/Shanghai')
                current_time = datetime.now(china_tz)
                formatted_time = current_time.strftime("%Y-%m-%d %H:%M:%S")
                f.write(formatted_time)
        else:
            print("没有找到优惠券信息")

# 启动异步程序
if __name__ == '__main__':
    asyncio.run(main())