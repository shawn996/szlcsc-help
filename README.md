# 🛍️ 立创商城优惠券助手

[![Deploy to GitHub Pages](https://github.com/shawn996/szlcsc-help/actions/workflows/run.yml/badge.svg)](https://github.com/shawn996/szlcsc-help/actions/workflows/run.yml)
一个帮助选择立创商城优惠券的网站工具。

## 📝 项目简介

本项目旨在帮助用户更好地筛选和了解立创商城优惠券信息。立创商城优惠券每月更新，并以品牌分类，用户往往难以快速找到所需元器件类型的优惠券。本站旨在解决这一痛点，我们以元器件分类为基础，为您筛选出优惠力度较大的优惠券。此外基于“1单可绑定10单免邮费”政策，建议您在下单时顺便捎带一些常见元器件，以备不时之需。

## ⚠️ 声明

- 💡 本项目仅用于辅助选择优惠券
- 🤝 不涉及任何商业行为
- 📚 数据来源：立创商城领券中心
- ✉️ 如有侵权，请联系删除

## ✨ 特点

- 🔄 自动筛选显示符合条件的优惠券
- 📊 优惠券分类展示
- ⚡ 及时时更新数据
- 🔍 支持搜索功能
- 📱 移动端适配

## 🎯 筛选条件

- 🚫 排除新人专享优惠券
- 💰 仅显示优惠后消费金额小于等于 2 元的优惠券
- 🏢 仅显示品牌优惠券

## 🤖 自动更新

本项目通过 GitHub Actions 实现自动更新：

- 📅 每月 1-7 号每天 8 点更新一次
- 🔄 每周二和周五更新一次

## 跟原版的区别
原版目前无法正常生成页面，且页面有点小问题。基于此原因，做出了此优化版本，主要修改为：异步获取优惠券数据，生成页面更快；添加了获取异常的处理；移除了统计代码及图标引用文件(只用了一个x却引入大量图标文件)，加快页面载入速度。另外执行时间改为早8点，优惠券改为优惠后消费金额小于2元的优惠券。

## 🚀 本地运行

1. 克隆项目

```bash
git clone https://github.com/shawn996/szlcsc-help.git
cd szlcsc-help
```

2. 安装依赖

```bash
pip install -r requirements.txt
```

3. 运行脚本生成数据

```bash
python main.py
```

4. 启动网页服务

- 使用 Python 内置服务器

```bash
cd html
python -m http.server 8080
```

- 或使用其他静态文件服务器

5. 访问网页
   打开浏览器访问 `http://localhost:8080`

## 🔧 技术栈

- 🐍 Python
- 🎨 HTML/CSS/JavaScript
- 🔄 GitHub Actions
