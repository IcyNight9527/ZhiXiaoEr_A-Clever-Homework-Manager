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
				<view class="value">v1.3.1 正式版</view>
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
							'新增了创建群聊时需要激活码的功能',
							'修复了群组外成员也会并入群组统计的bug'
						]
					},
					{
						version: 'v1.0.0 测试版',
						date: '2026-09-15',
						content: [
							'应用发布'
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
