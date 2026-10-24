<template>
	<view class="container">
		<view class="form-box">
			<view class="form-item">
				<text class="label">通知内容</text>
				<textarea
					class="textarea"
					v-model="content"
					placeholder="请输入通知内容，如：同学们记得下周一之前完成实验报告"
					maxlength="200"
				></textarea>
				<text class="tip">{{ content.length }}/200</text>
			</view>

			<button class="btn-primary" @click="handleSubmit">发布通知</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				group_id: '',
				content: ''
			}
		},
		onLoad(options) {
			this.group_id = options.group_id || ''
		},
		methods: {
			async handleSubmit() {
				if (!this.content.trim()) {
					uni.showToast({ title: '请输入通知内容', icon: 'none' })
					return
				}
				if (!this.group_id) {
					uni.showToast({ title: '缺少群组ID', icon: 'none' })
					return
				}

				uni.showLoading({ title: '发布中...' })
				try {
					const res = await uniCloud.callFunction({
						name: 'addNotification',
						data: {
							content: this.content.trim(),
							group_id: this.group_id,
							type: 'common'
						}
					})
					uni.hideLoading()

					if (res.result.code === 200) {
						uni.showToast({ title: '发布成功！' })
						setTimeout(() => uni.navigateBack(), 1000)
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}

				} catch (e) {
					uni.hideLoading()
					console.error('发布失败：', e)
					uni.showToast({ title: '网络异常', icon: 'none' })
				}
			}
		}
	}
</script>

<style>
	.container {
		padding: 20px;
		background-color: #f5f7fa;
		min-height: 100vh;
	}
	.form-box {
		background-color: #fff;
		border-radius: 12px;
		padding: 25px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	}
	.form-item { margin-bottom: 25px; }
	.label {
		font-size: 15px;
		color: #333;
		font-weight: bold;
		display: block;
		margin-bottom: 10px;
	}
	.textarea {
		width: 100%;
		height: 150px;
		background-color: #f5f7fa;
		border-radius: 8px;
		padding: 15px;
		font-size: 15px;
		box-sizing: border-box;
	}
	.tip {
		font-size: 12px;
		color: #999;
		margin-top: 8px;
		display: block;
		text-align: right;
	}
	.btn-primary {
		background-color: #007aff;
		color: #fff;
		border-radius: 25px;
		font-size: 16px;
		margin-top: 10px;
	}
</style>
