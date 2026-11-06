<template>
	<view class="container">
		<view class="about-card">
			<view class="app-name">智小二</view>
			<view class="app-desc">收集·打包·重命名一体化作业收集方案</view>

			<view class="info-line">
				<view class="label">与开发者联系：</view>
				<view class="value">QQ 410936697</view>
			</view>

			<view class="info-line">
				<view class="label">版本号：</view>
				<view class="value">v1.3.6</view>
			</view>

			<view class="log-title">更新日志</view>

			<view class="log-item" v-for="(log, i) in logs" :key="i">
				<view class="log-header">
					<text class="log-version">{{ log.version }}</text>
					<text class="log-date">{{ log.date }}</text>
				</view>
				<view class="log-content">
					<text v-for="(line, j) in log.content" :key="j" class="log-line">· {{ line }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				logs: [
					{
						version: 'v1.3.6',
						date: '2026-11-6',
						content: [
							'新增了用户反馈选项，可在 我的 一栏查看',
							'新增了网页端 登录页面左下角 可下载手机app的功能',
						]
					},
					{
						version: 'v1.3.5',
						date: '2026-11-5',
						content: [
							'移除了访客模式及相关入口',
							'新增了网页端单独下载学生提交文件功能',
							'新增了登录页网页版快捷入口和链接复制功能',
							'修复了作业格式、图片显示和截止时间问题',
							'优化了文件清理、ZIP打包和App更新流程',
							'优化了手机端页面宽度和排版',
							'优化了群组通知，最多保留最新三条',
							'优化了数据库访问控制与重复数据拦截功能'
						]
					},
					{
						version: 'v1.3.3 & v1.3.4',
						date: '2026-11-3',
						content: [
							'新增了访客模式',
							'修复了"教师"身份的创建者会被待办统计为未交的bug'
						]
					},
					{
						version: 'v1.3.2',
						date: '2026-10-29',
						content: [
							'新增了app内部的更新提示',
							'新增了提交截止一小时前的提醒功能',
							'新增了通行证体系，不同通行证可建立的最多群组数不同',
							'修复了群组名单不按学号排序的bug'
						]
					},
					{
						version: 'v1.3.1 正式版',
						date: '2026-09-26',
						content: [
							'完善了登录页的功能介绍海报',
						]
					},
					{
						version: 'v1.3.0 测试版',
						date: '2026-09-25',
						content: [
							'新增了登录页的功能介绍海报',
							'修复了布置作业时图片无法上传的bug'
						]
					},
					{
						version: 'v1.2.0 测试版',
						date: '2026-09-24',
						content: [
							'新增了布置作业的图片文件上传功能',
							'修复了提交作业时文件无法上传的bug'
						]
					},
					{
						version: 'v1.1.0 测试版',
						date: '2026-09-18',
						content: [
							'新增了群组功能',
							'新增了修改密码功能',
							'新增了创建群组时需要激活码的功能',
							'修复了群组外成员也会并入群组统计的bug'
						]
					},
					{
						version: 'v1.0.0 测试版',
						date: '2026-09-15',
						content: [
							'应用设计完毕'
						]
					}
				]
			}
		}
	}
</script>

<style>
	.container {
		padding: 40px 20px;
		background-color: #f5f7fa;
		min-height: 100vh;
	}
	.about-card {
		background-color: #fff;
		border-radius: 12px;
		padding: 30px 25px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	}
	.app-name {
		font-size: 26px;
		font-weight: bold;
		color: #007aff;
		margin-bottom: 8px;
	}
	.app-desc {
		font-size: 14px;
		color: #999;
		margin-bottom: 30px;
	}
	.info-line {
		margin-bottom: 20px;
	}
	.label {
		color: #999;
		font-size: 13px;
		margin-bottom: 6px;
	}
	.value {
		color: #333;
		font-size: 15px;
		font-weight: bold;
	}
	.log-title {
		font-size: 16px;
		font-weight: bold;
		color: #333;
		margin-top: 25px;
		margin-bottom: 15px;
	}
	.log-item {
		background-color: #f8f9fb;
		border-radius: 10px;
		padding: 15px;
		margin-bottom: 12px;
	}
	.log-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}
	.log-version {
		font-size: 15px;
		font-weight: bold;
		color: #007aff;
	}
	.log-date {
		font-size: 12px;
		color: #999;
	}
	.log-content {
		display: flex;
		flex-direction: column;
	}
	.log-line {
		font-size: 13px;
		color: #666;
		line-height: 1.8;
	}
</style>
