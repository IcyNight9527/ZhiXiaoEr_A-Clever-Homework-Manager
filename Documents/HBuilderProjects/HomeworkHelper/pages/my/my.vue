<template>
	<view class="container">
		<view class="profile-card">
			<view class="avatar">{{ userInfo.name ? userInfo.name[0] : '?' }}</view>
			<view class="info">
			    <view class="name">{{ userInfo.name }}</view>
			    <view class="uid">学号：{{ userInfo.userId }}</view>
			</view>
		</view>

		<view class="menu">
			<view class="menu-item" @click="changePassword">修改密码</view>
			<view class="menu-item" @click="goAbout">关于</view>
			<view class="menu-item logout" @click="logout">退出登录</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return { userInfo: {} }
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
			changePassword() {
				uni.showModal({
					title: '修改密码',
					editable: true,
					placeholderText: '请输入旧密码',
					success: (res1) => {
						if (!res1.confirm || !res1.content) return
						const oldPwd = res1.content

						// 👇 关键：延时 300ms 再弹第二个
						setTimeout(() => {
							uni.showModal({
								title: '修改密码',
								editable: true,
								placeholderText: '请输入新密码（至少6位）',
								success: async (res2) => {
									if (!res2.confirm || !res2.content) return
									const newPwd = res2.content

									if (newPwd.length < 6) {
										uni.showToast({ title: '新密码至少6位', icon: 'none' })
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
										if (r.result.code === 200) {
											uni.showToast({ title: '密码修改成功！' })
											setTimeout(() => {
												uni.removeStorageSync('userInfo')
												uni.reLaunch({ url: '/pages/login/login' })
											}, 1500)
										} else {
											uni.showToast({ title: r.result.msg, icon: 'none' })
										}
									} catch (e) {
										uni.hideLoading()
										uni.showToast({ title: '网络异常', icon: 'none' })
									}
								}
							})
						}, 300)   // 👈 延时 300 毫秒
					}
				})
			},
			goAbout() {
				uni.navigateTo({ url: '/pages/my/about' })
			},
			logout() {
				uni.showModal({
					title: '提示',
					content: '确定要退出登录吗？',
					success: (res) => {
						if (res.confirm) {
							uni.removeStorageSync('userInfo')
							uni.reLaunch({ url: '/pages/login/login' })
						}
					}
				})
			}
		}
	}
</script>

<style>
	.container { padding: 20px; background-color: #f5f7fa; min-height: 100vh; }
	.profile-card {
		background-color: #fff;
		border-radius: 12px;
		padding: 25px;
		display: flex;
		align-items: center;
		margin-bottom: 20px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	}
	.avatar {
		width: 60px; height: 60px;
		border-radius: 50%;
		background-color: #007aff;
		color: #fff;
		font-size: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 20px;
	}
	.name { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 6px; }
	.uid { font-size: 14px; color: #666; margin-bottom: 4px; }
	.role { font-size: 13px; color: #007aff; }
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
	.menu-item:last-child { border-bottom: none; }
	.menu-item.logout { color: #ff3b30; }
</style>
