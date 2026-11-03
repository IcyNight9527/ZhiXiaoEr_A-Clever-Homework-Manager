<template>
	<view class="container">
		<view class="profile-card">
			<view class="avatar">
				{{ userInfo.name ? userInfo.name[0] : '?' }}
			</view>
			<view class="info">
				<view class="name">{{ userInfo.name }}</view>
				<view class="uid">学号：{{ userInfo.userId }}</view>
			</view>
		</view>

		<view class="menu">
			<view class="menu-item" @click="changePassword">
				修改密码
			</view>
			<view class="menu-item" @click="goAbout">
				关于
			</view>
			<view class="menu-item" @click="getPassGuide">
				通行证获取
			</view>
			<view class="menu-item" @click="setDemoPassword">
				访客模式激活码
			</view>
			<view class="menu-item logout" @click="logout">
				退出登录
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userInfo: {}
		}
	},

	onShow() {
		const info = uni.getStorageSync('userInfo')
		if (!info) {
			uni.reLaunch({ url: '/pages/login/login' })
			return
		}

		this.userInfo = info
	},

	methods: {
		// 修改账号密码
		changePassword() {
			if (uni.getStorageSync('isDemoMode') === true) {
				uni.showModal({
					title: '访客模式已开启',
					content: '演示期间不可修改账号密码，请先退出访客模式。',
					showCancel: false
				})
				return
			}

			uni.showModal({
				title: '修改密码',
				editable: true,
				placeholderText: '请输入旧密码',
				success: (res1) => {
					if (!res1.confirm || !res1.content) return

					const oldPwd = res1.content

					// 延时打开第二个输入框
					setTimeout(() => {
						uni.showModal({
							title: '修改密码',
							editable: true,
							placeholderText: '请输入新密码（至少6位）',
							success: async (res2) => {
								if (!res2.confirm || !res2.content) return

								const newPwd = res2.content

								if (newPwd.length < 6) {
									uni.showToast({
										title: '新密码至少6位',
										icon: 'none'
									})
									return
								}

								// 提交前再次检查访客状态
								if (uni.getStorageSync('isDemoMode') === true) {
									uni.showToast({
										title: '访客模式下不可修改密码',
										icon: 'none'
									})
									return
								}

								uni.showLoading({ title: '修改中...' })

								try {
									const r = await uniCloud.callFunction({
										name: 'updatePassword',
										data: {
											userId: this.userInfo.userId,
											oldPassword: oldPwd,
											newPassword: newPwd
										}
									})

									uni.hideLoading()

									if (r.result?.code === 200) {
										uni.showToast({
											title: '密码修改成功！',
											icon: 'success'
										})

										setTimeout(() => {
											// 清除记住的旧密码，避免下次自动填入
											uni.removeStorageSync('rememberedLogin')
											uni.removeStorageSync('userInfo')
											uni.reLaunch({
												url: '/pages/login/login'
											})
										}, 1500)
									} else {
										uni.showToast({
											title: r.result?.msg || '修改失败，请重试',
											icon: 'none'
										})
									}
								} catch (e) {
									uni.hideLoading()
									console.error('修改账号密码失败：', e)
									uni.showToast({
										title: '网络异常，请稍后重试',
										icon: 'none'
									})
								}
							}
						})
					}, 300)
				}
			})
		},

		goAbout() {
			uni.navigateTo({
				url: '/pages/my/about'
			})
		},

		// 退出登录
		logout() {
			if (uni.getStorageSync('isDemoMode') === true) {
				uni.showModal({
					title: '访客模式已开启',
					content: '请先退出访客模式，再退出登录。',
					showCancel: false
				})
				return
			}

			uni.showModal({
				title: '提示',
				content: '确定要退出登录吗？',
				success: (res) => {
					if (!res.confirm) return

					// 确认时再次检查，避免状态在弹窗期间变化
					if (uni.getStorageSync('isDemoMode') === true) {
						uni.showToast({
							title: '请先退出访客模式',
							icon: 'none'
						})
						return
					}

					uni.removeStorageSync('userInfo')
					uni.reLaunch({
						url: '/pages/login/login'
					})
				}
			})
		},

		// 通行证获取说明
		getPassGuide() {
			uni.showModal({
				title: '创建群组需要通行证',
				content: '【普通】通行证（可创建一个群组）：访问开发者 GitHub 主页免费获取\n\n【高级】通行证（可创建三个群组）或【无限】通行证：请联系开发者获取',
				confirmText: '复制链接',
				success: (res) => {
					if (!res.confirm) return

					uni.setClipboardData({
						data: 'https://github.com/IcyNight9527',
						success: () => {
							uni.showToast({
								title: '链接已复制',
								icon: 'success'
							})
						}
					})
				}
			})
		},

		// 通用输入框：取消返回 null，确认返回输入内容
		askDemoCode(title, placeholderText) {
			return new Promise((resolve) => {
				uni.showModal({
					title,
					editable: true,
					placeholderText,
					success: (res) => {
						if (!res.confirm) {
							resolve(null)
							return
						}

						resolve((res.content || '').trim())
					},
					fail: () => {
						resolve(null)
					}
				})
			})
		},

		// 设置或修改访客激活码
		async setDemoPassword() {
			// 1. 检查登录状态
			const userId = this.userInfo.userId
			if (!userId) {
				uni.reLaunch({ url: '/pages/login/login' })
				return
			}

			// 2. 先检查通行证资格
			const passLevel = uni.getStorageSync('passLevel') || 'none'
			const canUseDemo =
				passLevel === 'high' || passLevel === 'unlimited'

			if (!canUseDemo) {
				uni.showModal({
					title: '需要通行证',
					content: '设置访客模式激活码需要高级或无限通行证，请先获取对应通行证。',
					showCancel: false
				})
				return
			}

			// 3. 有资格，再检查是否正在访客模式中
			if (uni.getStorageSync('isDemoMode') === true) {
				uni.showModal({
					title: '访客模式已开启',
					content: '请先使用原激活码退出访客模式，再修改激活码。',
					showCancel: false
				})
				return
			}

			try {
				// 4. 查询是否已设置过激活码
				uni.showLoading({ title: '查询中...' })

				const statusRes = await uniCloud.callFunction({
					name: 'updateDemoPassword',
					data: {
						user_id: userId,
						action: 'status'
					}
				})

				uni.hideLoading()

				const statusResult = statusRes.result
				if (
					!statusResult ||
					statusResult.code !== 200 ||
					typeof statusResult.data?.has_demo_password !== 'boolean'
				) {
					uni.showToast({
						title: statusResult?.code === 200
							? '状态数据异常，请检查云函数版本'
							: statusResult?.msg || '查询失败，请重试',
						icon: 'none'
					})
					return
				}

				const hasPassword = statusResult.data.has_demo_password
				let oldPassword = ''

				// 5. 已设置过：先验证旧激活码
				if (hasPassword) {
					const input = await this.askDemoCode(
						'验证旧访客激活码',
						'请输入当前使用的访客激活码'
					)

					if (input === null) return

					if (!input) {
						uni.showToast({
							title: '旧激活码不能为空',
							icon: 'none'
						})
						return
					}

					oldPassword = input

					uni.showLoading({ title: '验证中...' })

					const checkRes = await uniCloud.callFunction({
						name: 'checkDemoPassword',
						data: {
							user_id: userId,
							password: oldPassword
						}
					})

					uni.hideLoading()

					const checkResult = checkRes.result
					if (!checkResult || checkResult.code !== 200) {
						uni.showToast({
							title: checkResult?.msg || '验证失败，请重试',
							icon: 'none'
						})
						return
					}
				}

				// 6. 输入新激活码
				await new Promise(resolve => setTimeout(resolve, 300))

				const newPassword = await this.askDemoCode(
					hasPassword ? '设置新访客激活码' : '首次设置访客激活码',
					'请输入新的访客激活码'
				)

				if (newPassword === null) return

				if (!newPassword) {
					uni.showToast({
						title: '新激活码不能为空',
						icon: 'none'
					})
					return
				}

				if (hasPassword && newPassword === oldPassword) {
					uni.showToast({
						title: '新激活码不能与旧激活码相同',
						icon: 'none'
					})
					return
				}

				// 7. 保存前确认仍是同一账号，且未开启访客模式
				const currentUser = uni.getStorageSync('userInfo')
				if (!currentUser || currentUser.userId !== userId) {
					uni.showToast({
						title: '登录状态已变化，请重新操作',
						icon: 'none'
					})
					return
				}

				if (uni.getStorageSync('isDemoMode') === true) {
					uni.showModal({
						title: '访客模式已开启',
						content: '请先退出访客模式，再修改激活码。',
						showCancel: false
					})
					return
				}

				// 8. 保存，后端会再次校验旧激活码
				uni.showLoading({ title: '保存中...' })

				const updateRes = await uniCloud.callFunction({
					name: 'updateDemoPassword',
					data: {
						user_id: userId,
						action: 'update',
						old_demo_password: oldPassword,
						demo_password: newPassword
					}
				})

				uni.hideLoading()

				uni.showToast({
					title: updateRes.result?.msg || '保存失败，请重试',
					icon: updateRes.result?.code === 200
						? 'success'
						: 'none'
				})
			} catch (e) {
				uni.hideLoading()
				console.error('设置访客激活码失败：', e)
				uni.showToast({
					title: '网络异常，请稍后重试',
					icon: 'none'
				})
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

.profile-card {
	background-color: #fff;
	border-radius: 12px;
	padding: 25px;
	display: flex;
	align-items: center;
	margin-bottom: 20px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.avatar {
	width: 60px;
	height: 60px;
	border-radius: 50%;
	background-color: #007aff;
	color: #fff;
	font-size: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 20px;
}

.name {
	font-size: 20px;
	font-weight: bold;
	color: #333;
	margin-bottom: 6px;
}

.uid {
	font-size: 14px;
	color: #666;
	margin-bottom: 4px;
}

.role {
	font-size: 13px;
	color: #007aff;
}

.menu {
	background-color: #fff;
	border-radius: 12px;
	overflow: hidden;
}

.menu-item {
	padding: 18px 20px;
	font-size: 16px;
	color: #333;
	border-bottom: 1px solid #f0f0f0;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-item.logout {
	color: #ff3b30;
}
</style>
