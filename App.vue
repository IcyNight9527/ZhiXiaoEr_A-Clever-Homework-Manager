<script>
	export default {
		onLaunch() {
			// #ifdef APP-PLUS
			this.initializeApp()
			// #endif
		},

		onShow() {
			console.log('App Show')
		},

		onHide() {
			console.log('App Hide')
		},

		methods: {
			async initializeApp() {
				try {
					const res = await uniCloud.callFunction({
						name: 'getAppVersion'
					})

					const result = res.result || {}

					if (result.code !== 200 || !result.data) {
						return
					}

					const config = result.data

					// 优先处理版本升级。出现升级窗口时，本次不再显示更新日志。
					const updatePrompted = await this.promptUpdateIfNeeded(config)

					if (!updatePrompted) {
						await this.showUpdateLogIfNeeded(config)
					}
				} catch (error) {
					console.error('初始化版本信息失败：', error)
				}
			},

			parseVersion(version) {
				const value = String(version || '')
					.trim()
					.replace(/^v/i, '')

				if (!value) {
					return []
				}

				return value.split('.').map(item => {
					const number = parseInt(item, 10)
					return Number.isFinite(number) ? number : 0
				})
			},

			compareVersions(leftVersion, rightVersion) {
				const left = this.parseVersion(leftVersion)
				const right = this.parseVersion(rightVersion)

				if (left.length === 0 || right.length === 0) {
					return 0
				}

				const maxLength = Math.max(left.length, right.length)

				for (let i = 0; i < maxLength; i++) {
					const leftNumber = left[i] || 0
					const rightNumber = right[i] || 0

					if (leftNumber > rightNumber) return 1
					if (leftNumber < rightNumber) return -1
				}

				return 0
			},

			async promptUpdateIfNeeded(config) {
				const latestVersion = String(config.latest_version || '')
				const currentVersion = plus.runtime.version

				if (!latestVersion) {
					return false
				}

				// 只有线上版本高于当前版本才提示，避免降级
				if (this.compareVersions(latestVersion, currentVersion) <= 0) {
					return false
				}

				const modalResult = await new Promise(resolve => {
					uni.showModal({
						title: '发现新版本',
						content: `最新版本 v${latestVersion} 已发布，是否立即更新？`,
						confirmText: '立即更新',
						cancelText: '稍后更新',
						success: resolve,
						fail: () => resolve({ confirm: false })
					})
				})

				if (modalResult.confirm) {
					await this.downloadAndInstall(config.download_url)
				}

				return true
			},

			async showUpdateLogIfNeeded(config) {
				const currentVersion = plus.runtime.version
				const lastReadVersion = uni.getStorageSync('lastReadVersion')

				if (currentVersion === lastReadVersion) {
					return
				}

				const updateLog = String(config.update_log || '').trim()

				if (!updateLog) {
					return
				}

				await new Promise(resolve => {
					uni.showModal({
						title: `欢迎更新 v${currentVersion}`,
						content: updateLog,
						showCancel: false,
						confirmText: '开始使用',
						success: () => {
							uni.setStorageSync('lastReadVersion', currentVersion)
							resolve()
						},
						fail: resolve
					})
				})
			},

			async downloadAndInstall(downloadUrl) {
				let url = String(downloadUrl || '').trim()

				if (!url) {
					uni.showModal({
						title: '更新失败',
						content: '没有获取到安装包下载地址',
						showCancel: false
					})
					return
				}

				uni.showLoading({
					title: '准备下载...',
					mask: true
				})

				try {
					// 兼容 app_config 中仍然填写 cloud:// 文件 ID 的情况
					if (url.startsWith('cloud://')) {
						const tempRes = await uniCloud.getTempFileURL({
							fileList: [url]
						})

						const fileInfo = tempRes.fileList && tempRes.fileList[0]
						const tempFileURL = fileInfo && fileInfo.tempFileURL

						if (!tempFileURL) {
							throw new Error('获取安装包下载地址失败')
						}

						url = tempFileURL
					}

					if (
						!url.startsWith('https://') &&
						!url.startsWith('http://')
					) {
						throw new Error('安装包下载地址格式不正确')
					}

					uni.showLoading({
						title: '正在下载更新...',
						mask: true
					})

					const downloadResult = await new Promise((resolve, reject) => {
						const downloadTask = uni.downloadFile({
							url,
							success: resolve,
							fail: reject
						})

						downloadTask.onProgressUpdate(progressInfo => {
							uni.showLoading({
								title: `下载中 ${progressInfo.progress}%`,
								mask: true
							})
						})
					})

					if (downloadResult.statusCode !== 200) {
						throw new Error(`安装包下载失败，状态码 ${downloadResult.statusCode}`)
					}

					if (!downloadResult.tempFilePath) {
						throw new Error('下载完成，但没有获取到安装包文件')
					}

					await new Promise((resolve, reject) => {
						plus.runtime.install(
							downloadResult.tempFilePath,
							{ force: true },
							resolve,
							reject
						)
					})

					uni.showToast({
						title: '安装成功，即将重启',
						icon: 'none'
					})

					setTimeout(() => {
						plus.runtime.restart()
					}, 1500)
				} catch (error) {
					console.error('安装更新失败：', error)

					uni.showModal({
						title: '更新失败',
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
	/* 全局页面容器约束：所有页面内容占屏幕 1/3 并居中 */
	page {
		background-color: #f5f7fa;
	}

	/* 通用容器：所有页面的根 view 加这个 class 即可 */
	.container {
		width: 33%;
		min-width: 360px;
		margin: 0 auto;
		padding: 20px;
		min-height: 100vh;
		background-color: #f5f7fa;
		box-sizing: border-box;
	}
</style>
