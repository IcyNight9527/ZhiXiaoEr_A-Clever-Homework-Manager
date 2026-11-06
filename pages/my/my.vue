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
			<view class="menu-item" @click="goFeedback">
				用户反馈
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
			userInfo: {},
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
		goFeedback() {
			uni.navigateTo({
				url: '/pages/my/feedback'
			})
		},
		// 退出登录
		logout() {
			uni.showModal({
				title: '退出登录',
				content: '确定要退出登录吗？',
				success: (res) => {
					if (!res.confirm) return

					// 清除当前设备的登录资料，包括登录凭证
					uni.removeStorageSync('userInfo')

					// 清理通行证缓存，避免影响下一个账号
					uni.removeStorageSync('passLevel')

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
		}
	}
}
</script>

<style>
.container {
	width: 100%;
	max-width: 600px;
	min-width: 0;
	margin: 0 auto;
	padding: 20px;
	background-color: #f5f7fa;
	min-height: 100vh;
	box-sizing: border-box;
}

.profile-card {
	width: 100%;
	background-color: #fff;
	border-radius: 12px;
	padding: 25px;
	display: flex;
	align-items: center;
	margin-bottom: 20px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	box-sizing: border-box;
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
	width: 100%;
	background-color: #fff;
	border-radius: 12px;
	overflow: hidden;
	box-sizing: border-box;
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
