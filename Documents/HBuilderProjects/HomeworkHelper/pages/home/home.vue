<template>
	<view class="page-wrap">
		<!-- 欢迎栏 -->
		<view class="top-bar">
			<text class="top-name">你好，{{ userInfo.name }}</text>
			<view class="top-add" @click="showAddMenu">＋</view>
		</view>
		<view class="slogan-bar">
			<view>智小二</view>
			<view class="slogan-sub">收集 · 打包 · 重命名 一体化作业收集方案</view>
		</view>
		<!-- 数据区 -->
		<view v-if="loaded" class="data-wrap">
			<view class="label-title">我的待办</view>
			<view class="todo-box">
				<text v-if="pendingCount > 0">📝 你有 <text class="todo-num">{{ pendingCount }}</text> 份作业待提交</text>
				<text v-else>✅ 没有待提交的作业</text>
			</view>

			<view class="label-title">我的群组</view>
			<view class="card-list">
				<view class="card-item" v-for="g in groupList" :key="g._id" @click="goToGroup(g)">
					<view class="card-top">
						<text class="card-name">{{ g.name }}</text>
						<text class="card-count">{{ g.member_count || 0 }} 人</text>
					</view>
					<view class="card-bottom">
						<text class="card-code">群组号：{{ g.group_code }}</text>
					</view>
				</view>
			</view>
			<view class="empty-tip" v-if="groupList.length === 0">
				<text>还没有加入任何群组，点击右上角加入吧～</text>
			</view>
		</view>

		<!-- 骨架屏 -->
		<view v-else class="loading-wrap">
			<view class="loading-bar"></view>
			<view class="loading-bar short"></view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				userInfo: {},
				groupList: [],
				pendingCount: 0,
				loaded: false

			}
		},
		onShow() {
			this.loadUserInfo()
			this.loadAll()
		},
		methods: {
			loadUserInfo() {
				const info = uni.getStorageSync('userInfo')
				if (!info) {
					uni.reLaunch({ url: '/pages/login/login' })
					return
				}
				this.userInfo = info
			},

			async loadGroups() {
				try {
					const res = await uniCloud.callFunction({
						name: 'getMyGroup',
						data: { user_id: this.userInfo.userId }
					})
					this.groupList = res.result.data || []
				} catch (e) {
					console.error('获取群组失败：', e)
				}
			},

			async loadStats() {
				try {
					const res = await uniCloud.callFunction({
						name: 'getHomeStats',
						data: { user_id: this.userInfo.userId }
					})
					this.pendingCount = res.result.data.pendingCount || 0
				} catch (e) {
					console.error('获取统计失败：', e)
				}
			},

			async loadAll() {
				await Promise.all([this.loadGroups(), this.loadStats()])
				this.loaded = true    // 👈 数据全部加载完
			},

			showAddMenu() {
				uni.showActionSheet({
					itemList: ['创建群组', '加入群组'],
					success: (res) => {
						if (res.tapIndex === 0) this.createGroup()
						else if (res.tapIndex === 1) this.joinGroup()
					}
				})
			},

			createGroup() {
				uni.showModal({
					title: '创建群组',
					editable: true,
					placeholderText: '请输入激活码',
					success: async (res) => {
						if (!res.confirm || !res.content) return
						const code = res.content.trim()
						if (!code) return

						const userInfo = uni.getStorageSync('userInfo')
						uni.showLoading({ title: '验证中...' })
						try {
							const r = await uniCloud.callFunction({
								name: 'verifyInviteCode',
								data: { code: code, user_id: userInfo.userId }
							})
							uni.hideLoading()

							if (r.result.code === 200) {
								uni.navigateTo({ url: '/pages/group/create' })
							} else {
								uni.showToast({ title: r.result.msg, icon: 'none' })
							}
						} catch (e) {
							uni.hideLoading()
							uni.showToast({ title: '网络异常', icon: 'none' })
						}
					}
				})
			},

			joinGroup() {
				uni.showModal({
					title: '加入群组',
					editable: true,
					placeholderText: '请输入群组号',
					success: (res1) => {
						if (!res1.confirm || !res1.content) return
						const code = res1.content.trim()
						if (!/^\d{4}$/.test(code)) {
							uni.showToast({ title: '群组号必须是4位数字', icon: 'none' })
							return
						}

						// 延时弹第二个窗口
						setTimeout(() => {
							uni.showModal({
								title: '加入群组',
								editable: true,
								placeholderText: '请输入群组密码',
								success: async (res2) => {
									if (!res2.confirm || !res2.content) return
									const password = res2.content.trim()
									if (!/^\d{6}$/.test(password)) {
										uni.showToast({ title: '群组密码必须是6位数字', icon: 'none' })
										return
									}

									const userInfo = uni.getStorageSync('userInfo')
									uni.showLoading({ title: '加入中...' })
									try {
										const r = await uniCloud.callFunction({
											name: 'joinGroup',
											data: {
												group_code: code,
												group_password: password,
												user_id: userInfo.userId
											}
										})
										uni.hideLoading()
										if (r.result.code === 200) {
											uni.showToast({ title: '加入成功！' })
											this.loadGroups()
										} else {
											uni.showToast({ title: r.result.msg, icon: 'none' })
										}
									} catch (e) {
										uni.hideLoading()
										uni.showToast({ title: '网络异常', icon: 'none' })
									}
								}
							})
						}, 300)
					}
				})
			},

			goToGroup(g) {
				uni.navigateTo({
					url: `/pages/group/group?id=${g._id}&name=${g.name}`
				})
			}
		}
	}
</script>

<style>
	.page-wrap {
		padding: 20px;
		background-color: #f5f7fa;
		min-height: 100vh;
		box-sizing: border-box;
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 30px;
	}
	.top-name {
		font-size: 22px;
		font-weight: bold;
		color: #333;
	}
	.top-add {
		width: 36px;
		height: 36px;
		line-height: 34px;
		text-align: center;
		font-size: 24px;
		color: #fff;
		background-color: #007aff;
		border-radius: 50%;
	}

	.data-wrap { width: 100%; }

	.label-title {
		font-size: 16px;
		font-weight: bold;
		color: #333;
		margin-bottom: 12px;
	}

	.todo-box {
		background-color: #fff8e1;
		border-left: 4px solid #ffb300;
		padding: 15px;
		border-radius: 8px;
		font-size: 14px;
		color: #666;
		margin-bottom: 25px;
	}
	.todo-num {
		font-weight: bold;
		color: #ff3b30;
	}

	.card-list { width: 100%; }
	.card-item {
		background-color: #fff;
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 15px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	}
	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
	}
	.card-name {
		font-size: 17px;
		font-weight: bold;
		color: #333;
	}
	.card-count {
		font-size: 13px;
		color: #999;
	}
	.card-bottom {
		display: flex;
		justify-content: flex-end;
	}
	.card-code {
		font-size: 13px;
		color: #999;
	}

	.empty-tip {
		text-align: center;
		color: #999;
		font-size: 15px;
		padding: 60px 0;
	}

	.loading-wrap { padding: 20px 0; }
	.loading-bar {
		height: 60px;
		background-color: #eee;
		border-radius: 12px;
		margin-bottom: 15px;
		width: 100%;
	}
	.loading-bar.short {
		height: 80px;
		width: 100%;
	}
	.slogan-bar {
		background-color: #e6f0ff;
		padding: 15px;
		border-radius: 8px;
		margin-bottom: 15px;
		text-align: center;
	}
	.slogan-bar > view:first-child {
		font-size: 18px;
		font-weight: bold;
		color: #0055cc;
		margin-bottom: 6px;
	}
	.slogan-sub {
		font-size: 13px;
		color: #007aff;
	}
</style>
