# 🛍️ 立创商城优惠券助手

[![Deploy to GitHub Pages](https://github.com/shawn996/szlcsc-help/actions/workflows/run.yml/badge.svg)](https://github.com/shawn996/szlcsc-help/actions/workflows/run.yml)
一个帮助选择立创商城优惠券的网站工具。

## 📝 项目简介

本项目旨在帮助用户更便捷地选择立创商城领券中心的优惠券。由于立创商城的优惠券每月更新，且大部分品牌对用户来说并不熟悉，本工具可以帮助用户更好地筛选和了解优惠券信息。

## ⚠️ 声明

- 💡 本项目仅用于辅助选择优惠券
- 🤝 不涉及任何商业行为
- 📚 数据来源：立创商城领券中心
- ✉️ 如有侵权，请联系删除

## ✨ 特点

- 🔄 自动筛选显示符合条件的优惠券
- 📊 优惠券分类展示
- ⚡ 实时更新数据
- 🔍 支持搜索功能
- 📱 移动端适配

## 🎯 筛选条件

- 🚫 排除新人专享优惠券
- 💰 仅显示优惠后消费金额小于 2 元的优惠券
- 🏢 仅显示品牌优惠券

## 🤖 自动更新

本项目通过 GitHub Actions 实现自动更新：

- 📅 每月 1-7 号每天 8 点更新一次
- 🔄 每周二和周五更新一次

## 跟原版的区别
原版目前无法正常生成页面，基于此原因，修改成了目前的异步获取版本，生成页面更快，添加了获取异常的处理。另外执行时间改为早8点，优惠券改为优惠后消费金额小于2元的优惠券。

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
