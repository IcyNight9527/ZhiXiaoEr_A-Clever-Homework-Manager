<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')

			// #ifdef APP-PLUS
			this.checkAppUpdate()
			this.showUpdateLog()
			// #endif
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		},
		methods: {
			async checkAppUpdate() {
				try {
					// 1. 请求云函数获取最新版本信息
					const res = await uniCloud.callFunction({
						name: 'getAppVersion'
					})

					if (res.result.code === 200) {
						const config = res.result.data
						const latestVersion = config.latest_version
						const downloadUrl = config.download_url

						// 2. 获取当前手机App的版本号
						const currentVersion = plus.runtime.version

						// 3. 比较版本号
						if (latestVersion !== currentVersion) {
							// 发现新版本，弹窗提示
							uni.showModal({
								title: '发现新版本',
								content: `最新版本 v${latestVersion} 已发布，是否立即更新？`,
								confirmText: '立即更新',
								success: (modalRes) => {
									if (modalRes.confirm) {
										this.downloadAndInstall(downloadUrl)
									}
								}
							})
						}
					}
				} catch (e) {
					console.error('检查更新失败：', e)
				}
			},

			showUpdateLog() {
						const currentVersion = plus.runtime.version
						const lastReadVersion = uni.getStorageSync('lastReadVersion')

						// 如果当前版本和上次读过的版本不一样，说明是刚更新
						if (currentVersion !== lastReadVersion) {
							uniCloud.callFunction({
								name: 'getAppVersion'
							}).then(res => {
								if (res.result.code === 200 && res.result.data.update_log) {
									uni.showModal({
										title: `欢迎更新 v${currentVersion}`,
										content: res.result.data.update_log,
										showCancel: false,
										confirmText: '开始使用',
										success: () => {
											// 把当前版本存进本地，下次再打开就不弹了
											uni.setStorageSync('lastReadVersion', currentVersion)
										}
									})
								}
							})
						}
					},
			downloadAndInstall(url) {
				// 检查是否是有效的直链（防止有人填了GitHub网页链接）
				if (!url || !url.endsWith('.apk')) {
					// 如果不是直链，走备用方案，跳转外部浏览器
					uni.showModal({
						title: '提示',
						content: '即将跳转外部浏览器下载，下载完成后请手动安装。',
						success: (res) => {
							if (res.confirm) {
								plus.runtime.openURL(url)
							}
						}
					})
					return
				}

				// 使用内部下载逻辑
				uni.showLoading({ title: '正在下载更新...', mask: true })

				const downloadTask = uni.downloadFile({
					url: url,
					success: (downloadResult) => {
						if (downloadResult.statusCode === 200) {
							uni.hideLoading()

							// 调起系统安装
							plus.runtime.install(
								downloadResult.tempFilePath,
								{ force: true }, // 强制覆盖安装
								() => {
									// 安装成功，重启App
									uni.showToast({ title: '安装成功，即将重启', icon: 'none' })
									setTimeout(() => {
										plus.runtime.restart()
									}, 1500)
								},
								(err) => {
									uni.showToast({ title: '安装失败', icon: 'none' })
									console.error('安装失败:', err)
								}
							)
						}
					},
					fail: (err) => {
						uni.hideLoading()
						uni.showToast({ title: '下载失败，请检查网络', icon: 'none' })
						console.error('下载失败:', err)
					}
				})

				// 可选：你可以在控制台看看下载进度
				downloadTask.onProgressUpdate((progressRes) => {
					console.log('下载进度：', progressRes.progress + '%')
				})
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
