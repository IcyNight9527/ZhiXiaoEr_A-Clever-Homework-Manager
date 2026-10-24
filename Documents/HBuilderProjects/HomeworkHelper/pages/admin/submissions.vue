<template>
	<view class="container">
		<!-- 作业标题 -->
		<view class="header">
			<view class="title">{{ title }}</view>
			<view class="stats">
				共 {{ data.total }} 人 · 已交 {{ data.submittedCount }} 人 · 未交 {{ data.notSubmittedCount }} 人
			</view>
			<button class="pack-btn" v-if="isH5" @click="handlePack">📦 打包下载</button>
		</view>

		<!-- 已交名单 -->
		<view class="section-title">✅ 已交名单（{{ data.submittedCount }}）</view>
		<view class="list-box" v-if="data.submittedList && data.submittedList.length > 0">
			<view class="list-item" v-for="(s, i) in data.submittedList" :key="i">
				<text class="name">{{ s.student_id }}</text>
				<text class="extra">文件：{{ s.renamed_file }}</text>
			</view>
		</view>
		<view class="empty-box" v-else>暂无提交记录</view>

		<!-- 未交名单 -->
		<view class="section-title">❌ 未交名单（{{ data.notSubmittedCount }}）</view>
		<view class="list-box" v-if="data.notSubmittedList && data.notSubmittedList.length > 0">
			<view class="list-item" v-for="(s, i) in data.notSubmittedList" :key="i">
				<text class="name">{{ s.userId }} {{ s.name }}</text>
			</view>
		</view>
		<view class="empty-box" v-else>全部已交 🎉</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				homework_id: '',
				group_id: '',
				title: '',
				data: {
					total: 0,
					submittedCount: 0,
					notSubmittedCount: 0,
					submittedList: [],
					notSubmittedList: [],
					isH5: false
				}
			}
		},
		onLoad(options) {
			this.homework_id = options.homework_id
			this.group_id = options.group_id
			this.title = options.title || '提交情况'
			this.isH5 = true
			this.loadData()
		},
		methods: {
			async loadData() {
				try {
					const res = await uniCloud.callFunction({
						name: 'getSubmission',
						data: {
							homework_id: this.homework_id,
							group_id: this.group_id
						}
					})
					if (res.result.code === 200) {
						this.data = res.result.data
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				} catch (e) {
					console.error('加载失败：', e)
				}
			},
			async handlePack() {
				// #ifndef H5
				uni.showModal({
					title: '提示',
					content: '请用电脑端打包发送',
					showCancel: false
				})
				return
				// #endif

				// H5 端：确认
				uni.showModal({
					title: '确认打包',
					content: `确认打包《${this.title}》的所有作业吗？\n（请在电脑端打包，打包后会触发浏览器下载）`,
					success: async (res) => {
						if (res.confirm) {
							await this.doPack()
						}
					}
				})
			},

			async doPack() {
				// 1. 拿文件列表
				uni.showLoading({ title: '获取文件列表...' })
				let fileList = []
				try {
					const r = await uniCloud.callFunction({
						name: 'getAllFileUrls',
						data: {
							homework_id: this.homework_id,
							group_id: this.group_id
						}
					})
					if (r.result.code !== 200) {
						uni.hideLoading()
						uni.showToast({ title: r.result.msg, icon: 'none' })
						return
					}
					fileList = r.result.data
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: '获取失败', icon: 'none' })
					return
				}

				if (fileList.length === 0) {
					uni.hideLoading()
					uni.showToast({ title: '暂无文件', icon: 'none' })
					return
				}

				// 2. 加载 JSZip（如果没加载过）
				if (!window.JSZip) {
					uni.showLoading({ title: '加载打包库...' })
					await new Promise((resolve, reject) => {
						const script = document.createElement('script')
						script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
						script.onload = resolve
						script.onerror = reject
						document.head.appendChild(script)
					})
				}

				// 3. 逐个下载文件并加入 zip
				const zip = new window.JSZip()
				let successCount = 0

				for (let i = 0; i < fileList.length; i++) {
					const f = fileList[i]
					uni.showLoading({ title: `下载中 ${i+1}/${fileList.length}` })
					try {
						const resp = await fetch(f.url)
						const blob = await resp.blob()
						zip.file(f.name, blob)
						successCount++
					} catch (e) {
						console.warn(`文件 ${f.name} 下载失败`, e)
					}
				}

				if (successCount === 0) {
					uni.hideLoading()
					uni.showToast({ title: '所有文件下载失败', icon: 'none' })
					return
				}

				// 4. 生成 zip 并触发下载
				uni.showLoading({ title: '生成压缩包...' })
				const content = await zip.generateAsync({ type: 'blob' })

				const url = URL.createObjectURL(content)
				const a = document.createElement('a')
				a.href = url
				a.download = `${this.title}_${Date.now()}.zip`
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				URL.revokeObjectURL(url)

				uni.hideLoading()
				uni.showToast({ title: '打包完成！', icon: 'success' })
			}
		}
	}
</script>

<style>
	.container { padding: 20px; background-color: #f5f7fa; min-height: 100vh; }
	.header { margin-bottom: 25px; }
	.title { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 8px; }
	.stats { font-size: 13px; color: #666; }

	.section-title {
		font-size: 15px;
		font-weight: bold;
		color: #333;
		margin: 20px 0 12px;
	}
	.list-box {
		background-color: #fff;
		border-radius: 10px;
		overflow: hidden;
	}
	.list-item {
		padding: 15px 18px;
		border-bottom: 1px solid #f0f0f0;
		display: flex;
		flex-direction: column;
	}
	.list-item:last-child { border-bottom: none; }
	.name { font-size: 15px; color: #333; font-weight: bold; }
	.extra { font-size: 12px; color: #999; margin-top: 5px; }

	.empty-box {
		background-color: #fff;
		border-radius: 10px;
		padding: 30px;
		text-align: center;
		color: #999;
		font-size: 14px;
	}
	.pack-btn {
		margin-top: 15px;
		background-color: #007aff;
		color: #fff;
		font-size: 14px;
		border-radius: 20px;
		height: 40px;
		line-height: 40px;
	}
</style>
