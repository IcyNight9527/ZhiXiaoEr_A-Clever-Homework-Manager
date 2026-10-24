<template>
	<view class="container">
		<!-- 作业信息 -->
		<view class="info-card">
			<view class="subject">{{ subject }}</view>
			<view class="title">{{ desc }}</view>
			<view class="ext-tip">允许格式：{{ extList.join('、') }}</view>
		</view>

		<!-- 文件选择区 -->
		<view class="upload-box" @click="chooseFile">
			<view v-if="!filePath" class="upload-placeholder">
				<text class="plus">＋</text>
				<text class="tip">点击选择文件</text>
			</view>
			<view v-else class="file-info">
				<text class="file-name">{{ fileName }}</text>
				<text class="change">点击重新选择</text>
			</view>
		</view>

		<!-- 提交按钮 -->
		<button class="btn-primary" @click="handleSubmit" :disabled="!filePath">
			提 交 作 业
		</button>

		<!-- 状态提示 -->
		<view class="status-tip" v-if="statusText">
			<text>{{ statusText }}</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				homework_id: '',
				subject: '',
				title: '',
				extList: [],
				group_id: '',

				filePath: '',      // 本地文件路径（用于上传）
				fileName: '',      // 原始文件名

				statusText: ''
			}
		},
		onLoad(options) {
			this.homework_id = options.id || ''
			this.subject = options.subject || ''
			this.desc = options.desc || ''
			this.extList = (options.ext || '').split(',').filter(e => e)
			this.group_id = options.group_id || ''
		},
		methods: {
			// 1. 选择文件
			chooseFile() {
				// #ifdef H5
				uni.chooseFile({
					count: 1,
					success: (res) => {
						const file = res.tempFiles[0]

						// 文件大小限制 50MB
						const MAX_SIZE = 50 * 1024 * 1024
						if (file.size && file.size > MAX_SIZE) {
							uni.showToast({ title: '文件不能超过 50MB', icon: 'none' })
							return
						}

						this.filePath = file.path
						this.fileName = file.name
					}
				})
				// #endif

				// #ifndef H5
				uni.chooseFile({
					count: 1,
					success: (res) => {
						const file = res.tempFiles[0]

						const MAX_SIZE = 50 * 1024 * 1024
						if (file.size && file.size > MAX_SIZE) {
							uni.showToast({ title: '文件不能超过 50MB', icon: 'none' })
							return
						}

						this.filePath = file.path
						this.fileName = file.name
					},
					fail: () => {
						uni.showToast({ title: '请使用文件管理器选择', icon: 'none' })
					}
				})
				// #endif
			},

			// 2. 校验格式
			checkExt() {
				const ext = this.fileName.split('.').pop().toLowerCase()
				if (this.extList.includes('all')) {
					return { ok: true, ext }
				}
				if (!this.extList.includes(ext)) {
					return { ok: false, msg: `格式错误！只允许提交 ${this.extList.join('、')} 格式` }
				}
				return { ok: true, ext }
			},

			// 3. 提交
			async handleSubmit() {
				// 前端先校验格式
				const check = this.checkExt()
				if (!check.ok) {
					this.statusText = check.msg
					uni.showToast({ title: check.msg, icon: 'none' })
					return
				}

				const userInfo = uni.getStorageSync('userInfo')
				if (!userInfo) {
					uni.reLaunch({ url: '/pages/login/login' })
					return
				}

				uni.showLoading({ title: '上传中...' })

				try {
					// 4. 上传文件到云存储
					const uploadRes = await uniCloud.uploadFile({
						filePath: this.filePath,
						cloudPath: `homework/${Date.now()}_${this.fileName}`
					})

					// 5. 调云函数记录提交
					const res = await uniCloud.callFunction({
						name: 'submitHomework',
						data: {
							file_url: uploadRes.fileID,
							original_name: this.fileName,
							homework_id: this.homework_id,
							student_id: userInfo.userId,
							group_id: this.group_id
						}
					})

					uni.hideLoading()

					if (res.result.code === 200) {
						this.statusText = `✅ 提交成功！文件已重命名为：${res.result.data.renamed_file}`
						uni.showToast({ title: '提交成功！' })
						setTimeout(() => {
							uni.navigateBack()
						}, 2000)
					} else {
						this.statusText = `❌ ${res.result.msg}`
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}

				} catch (e) {
					uni.hideLoading()
					console.error('提交失败：', e)
					this.statusText = '❌ 网络异常，请重试'
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
	.info-card {
		background-color: #fff;
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 20px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	}
	.subject { font-size: 14px; color: #007aff; font-weight: bold; margin-bottom: 8px; }
	.title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 12px; }
	.ext-tip { font-size: 13px; color: #ff8f00; }

	.upload-box {
		background-color: #fff;
		border: 2px dashed #ccc;
		border-radius: 12px;
		padding: 40px 20px;
		text-align: center;
		margin-bottom: 25px;
	}
	.upload-placeholder { display: flex; flex-direction: column; align-items: center; }
	.plus { font-size: 40px; color: #007aff; line-height: 1; }
	.tip { font-size: 14px; color: #999; margin-top: 10px; }
	.file-info { display: flex; flex-direction: column; }
	.file-name { font-size: 15px; color: #333; font-weight: bold; margin-bottom: 8px; }
	.change { font-size: 13px; color: #007aff; }

	.btn-primary {
		background-color: #007aff;
		color: #fff;
		border-radius: 25px;
		font-size: 16px;
	}
	.btn-primary[disabled] {
		background-color: #ccc;
	}

	.status-tip {
		margin-top: 20px;
		padding: 15px;
		background-color: #fff;
		border-radius: 10px;
		font-size: 14px;
		color: #333;
		text-align: center;
	}
</style>
