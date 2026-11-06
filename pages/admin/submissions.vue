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
		<view
			class="list-box"
			v-if="data.submittedList && data.submittedList.length > 0"
		>
			<view
				class="list-item submission-item"
				v-for="(s, i) in data.submittedList"
				:key="s._id || i"
			>
				<view class="submission-info">
					<text class="name">{{ s.student_id }}</text>
					<text class="extra">文件：{{ s.renamed_file || s.original_name }}</text>
				</view>

				<button
					class="download-btn"
					v-if="isH5 && s.file_url"
					@click="downloadSubmission(s)"
				>
					下载
				</button>
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
				isH5: false,
				data: {
					total: 0,
					submittedCount: 0,
					notSubmittedCount: 0,
					submittedList: [],
					notSubmittedList: []
				}
			}
		},
		onLoad(options) {
			const decodeQueryValue = value => {
				const text = String(value || '')

				// 只处理包含 URL 编码字符的值
				if (!/%[0-9a-fA-F]{2}/.test(text)) {
					return text
				}

				try {
					return decodeURIComponent(text)
				} catch (error) {
					console.warn('路由参数解码失败：', error)
					return text
				}
			}

			this.homework_id = decodeQueryValue(options.homework_id)
			this.group_id = decodeQueryValue(options.group_id)
			this.title = decodeQueryValue(options.title) || '提交情况'

			// #ifdef H5
			this.isH5 = true
			// #endif

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
			async downloadSubmission(submission) {
				// #ifndef H5
				return
				// #endif

				const fileID = submission && submission.file_url

				if (!fileID) {
					uni.showToast({
						title: '找不到提交文件',
						icon: 'none'
					})
					return
				}

				uni.showLoading({
					title: '正在下载...',
					mask: true
				})

				try {
					let downloadUrl = fileID

					// 旧数据可能是 http 地址，新数据一般是 cloud:// 文件ID
					if (
						!downloadUrl.startsWith('http://') &&
						!downloadUrl.startsWith('https://')
					) {
						const tempRes = await uniCloud.getTempFileURL({
							fileList: [fileID]
						})

						const fileInfo = tempRes.fileList && tempRes.fileList[0]

						if (!fileInfo || !fileInfo.tempFileURL) {
							throw new Error('获取文件下载地址失败')
						}

						downloadUrl = fileInfo.tempFileURL
					}

					const response = await fetch(downloadUrl)

					if (!response.ok) {
						throw new Error(`文件下载失败，状态码 ${response.status}`)
					}

					const blob = await response.blob()

					if (!blob || blob.size === 0) {
						throw new Error('下载到的文件内容为空')
					}

					const rawName =
						submission.renamed_file ||
						submission.original_name ||
						`${submission.student_id || '学生'}_作业`

					const fileName = this.makeUniqueZipName(
						rawName,
						new Set()
					)

					const objectUrl = URL.createObjectURL(blob)
					const link = document.createElement('a')

					link.href = objectUrl
					link.download = fileName
					document.body.appendChild(link)
					link.click()
					document.body.removeChild(link)

					setTimeout(() => {
						URL.revokeObjectURL(objectUrl)
					}, 1000)

					uni.showToast({
						title: '下载成功',
						icon: 'success'
					})
				} catch (error) {
					console.error('下载单个文件失败：', error)

					uni.showModal({
						title: '下载失败',
						content: error.message || '请检查网络后重试',
						showCancel: false
					})
				} finally {
					uni.hideLoading()
				}
			},
			async handlePack() {
				// #ifndef H5
				uni.showModal({
					title: '提示',
					content: '网页端',
					showCancel: false
				})
				return
				// #endif

				// H5 端：确认
				uni.showModal({
					title: '确认打包',
					content: `确认打包《${this.title}》的所有作业吗？\n（请在浏览器网页端打包，打包后会触发浏览器下载）`,
					success: async (res) => {
						if (res.confirm) {
							await this.doPack()
						}
					}
				})
			},
			makeUniqueZipName(rawName, usedNames) {
				const fallbackName = '未命名文件'

				let name = String(rawName || fallbackName)
					.replace(/[\\/:*?"<>|\r\n]/g, '_')
					.trim()

				if (!name) {
					name = fallbackName
				}

				const lastDotIndex = name.lastIndexOf('.')

				const baseName = lastDotIndex > 0
					? name.slice(0, lastDotIndex)
					: name

				const extension = lastDotIndex > 0
					? name.slice(lastDotIndex)
					: ''

				let candidate = name
				let suffix = 1

				while (usedNames.has(candidate)) {
					candidate = `${baseName}(${suffix})${extension}`
					suffix++
				}

				usedNames.add(candidate)
				return candidate
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
			},
			async doPack() {
				uni.showLoading({
					title: '获取文件列表...',
					mask: true
				})

				try {
					// 1. 获取全部文件临时地址
					const res = await uniCloud.callFunction({
						name: 'getAllFileUrls',
						data: {
							homework_id: this.homework_id,
							group_id: this.group_id
						}
					})

					const result = res.result || {}

					if (result.code !== 200) {
						throw new Error(result.msg || '获取文件列表失败')
					}

					const fileList = Array.isArray(result.data)
						? result.data
						: []

					if (fileList.length === 0) {
						uni.showToast({
							title: '暂无文件',
							icon: 'none'
						})
						return
					}

					// 2. 加载 JSZip
					if (!window.JSZip) {
						uni.showLoading({
							title: '加载打包组件...',
							mask: true
						})

						await new Promise((resolve, reject) => {
							const script = document.createElement('script')
							script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
							script.onload = resolve
							script.onerror = () => {
								reject(new Error('打包组件加载失败，请检查网络'))
							}
							document.head.appendChild(script)
						})
					}

					if (!window.JSZip) {
						throw new Error('打包组件初始化失败')
					}

					const zip = new window.JSZip()
					const usedNames = new Set()

					// 3. 逐个下载并处理同名文件
					for (let i = 0; i < fileList.length; i++) {
						const file = fileList[i]

						uni.showLoading({
							title: `下载中 ${i + 1}/${fileList.length}`,
							mask: true
						})

						const response = await fetch(file.url)

						if (!response.ok) {
							throw new Error(
								`文件“${file.name || '未命名文件'}”下载失败，状态码 ${response.status}`
							)
						}

						const blob = await response.blob()

						if (!blob || blob.size === 0) {
							throw new Error(
								`文件“${file.name || '未命名文件'}”内容为空`
							)
						}

						const uniqueName = this.makeUniqueZipName(
							file.name,
							usedNames
						)

						zip.file(uniqueName, blob)
					}

					// 4. 生成 ZIP
					uni.showLoading({
						title: '生成压缩包...',
						mask: true
					})

					const content = await zip.generateAsync({
						type: 'blob'
					})

					// 5. 触发浏览器下载
					const downloadUrl = URL.createObjectURL(content)
					const downloadName = this.makeUniqueZipName(
						`${this.title || '作业'}_${Date.now()}.zip`,
						new Set()
					)

					const link = document.createElement('a')
					link.href = downloadUrl
					link.download = downloadName
					document.body.appendChild(link)
					link.click()
					document.body.removeChild(link)
					URL.revokeObjectURL(downloadUrl)

					uni.showToast({
						title: '打包完成！',
						icon: 'success'
					})
				} catch (error) {
					console.error('打包下载失败：', error)

					uni.showModal({
						title: '打包失败',
						content: error.message || '请检查网络后重试',
						showCancel: false
					})
				} finally {
					uni.hideLoading()
				}
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
	.submission-item {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.submission-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.download-btn {
		width: auto;
		height: 34px;
		line-height: 34px;
		margin: 0;
		padding: 0 18px;
		background-color: #e6f0ff;
		color: #007aff;
		border-radius: 17px;
		font-size: 13px;
		white-space: nowrap;
	}

	.download-btn::after {
		border: none;
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
