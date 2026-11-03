<template>
	<view class="page-wrap">
		<!-- 欢迎栏 -->
		<view class="top-bar">
			<view class="welcome-left">
				<text class="top-name">你好，{{ userInfo.name }}</text>
				<text class="pass-tag" :class="'tag-' + passLevel" @click="openPassModal">
					{{ passText }}
				</text>
			</view>
			<view class="demo-btn" @click="toggleDemoMode">
				{{ isDemoMode ? '访客模式：开启' : '访客模式：关闭' }}
			</view>
			<!-- 加号保持不变 -->
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
				loaded: false,
				passLevel: 'none',
				groupCount: 0,
				passInfoLoaded: false,
				isDemoMode: uni.getStorageSync('isDemoMode') === true

			}
		},
		onShow() {
			// 没登录就返回，不继续请求数据
			const info = uni.getStorageSync('userInfo')
			if (!info) {
				uni.reLaunch({ url: '/pages/login/login' })
				return
			}

			this.userInfo = info

			// 每次回到主页，都重新同步并查询
			this.isDemoMode = uni.getStorageSync('isDemoMode') === true
			this.passInfoLoaded = false

			this.loadAll()
			this.loadPassInfo()
		},
		computed: {
			passText() {
				const map = {
					none: '无',
					normal: '普通',
					high: '高级',
					unlimited: '无限'
				}
				const levelText = map[this.passLevel] || '无'
				return `通行证：${levelText}`
			}
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
			async loadPassInfo() {
				this.passInfoLoaded = false

				const userId = this.userInfo.userId
				if (!userId) return

				try {
					const res = await uniCloud.callFunction({
						name: 'getUserPass',
						data: { user_id: userId }
					})

					// 请求期间如果切换了账号，不使用旧账号的结果
					const currentUser = uni.getStorageSync('userInfo')
					if (!currentUser || currentUser.userId !== userId) {
						return
					}

					const result = res.result
					if (!result || result.code !== 200 || !result.data) {
						console.warn('获取通行证失败：', result)
						return
					}

					const level = result.data.pass_level
					const validLevels = ['none', 'normal', 'high', 'unlimited']

					// 返回异常时，不当成“无通行证”，也不关闭保护
					if (!validLevels.includes(level)) {
						console.warn('通行证等级异常：', level)
						return
					}

					this.passLevel = level
					this.groupCount = result.data.group_count || 0
					uni.setStorageSync('passLevel', level)

					const canUseDemo =
						level === 'high' || level === 'unlimited'

					if (!canUseDemo) {
						// 云端确认没有使用资格：清除残留的开启状态
						uni.removeStorageSync('isDemoMode')
						this.isDemoMode = false
					} else {
						// 有资格：保留实际的开关状态
						this.isDemoMode =
							uni.getStorageSync('isDemoMode') === true
					}

					this.passInfoLoaded = true
				} catch (e) {
					console.error('获取通行证失败：', e)
					// 查询失败时，不改动原有访客模式状态
				}
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

					if (res.result.code === 200) {
						this.pendingCount = res.result.data.pendingCount || 0

						// 👇 新增：如果有快截止的作业，弹窗提醒
						if (res.result.data.urgentMsg) {
							uni.showModal({
								title: '⚠️ 作业即将截止',
								content: res.result.data.urgentMsg,
								showCancel: false,
								confirmText: '我知道了'
							})
						}
				}
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
			    // 1. 配额判断
			    let quota = 0
			    if (this.passLevel === 'normal') quota = 1
			    else if (this.passLevel === 'high') quota = 3
			    else if (this.passLevel === 'unlimited') quota = 9999

			    if (this.groupCount >= quota) {
			        uni.showModal({
			            title: '配额不足',
			            content: '您当前的通行证无法创建更多群组，请前往“我的”页面获取或升级。',
			            showCancel: false
			        })
			        return
			    }

			    // 2. 配额够，跳转
			    uni.navigateTo({ url: '/pages/group/create' })
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
			},
			openPassModal() {
						uni.showModal({
							title: '激活通行证',
							editable: true,
							placeholderText: '请输入通行证号码',
							success: async (res) => {
								if (res.confirm && res.content) {
									const code = res.content.trim()

									uni.showLoading({ title: '验证中...' })
									try {
										const r = await uniCloud.callFunction({
											name: 'updatePassLevel',
											data: {
												user_id: this.userInfo.userId,
												pass_code: code
											}
										})
										uni.hideLoading()

										if (r.result.code === 200) {
											uni.showToast({ title: '激活成功！', icon: 'success' })
											// 重新加载通行证信息以刷新界面
											this.loadPassInfo()
										} else {
											uni.showToast({ title: r.result.msg, icon: 'none' })
										}
									} catch (e) {
										uni.hideLoading()
										uni.showToast({ title: '网络异常', icon: 'none' })
									}
								}
							}
						})
					},
			toggleDemoMode() {
				// 1. 通行证信息尚未获取成功，不允许切换
				if (!this.passInfoLoaded) {
					uni.showToast({
						title: '通行证信息未就绪，请稍后重试',
						icon: 'none'
					})

					// 重新获取，成功后再点击按钮
					this.loadPassInfo()
					return
				}

				// 2. 检查通行证资格
				const canUseDemo =
					this.passLevel === 'high' ||
					this.passLevel === 'unlimited'

				if (!canUseDemo) {
					uni.showModal({
						title: '需要通行证',
						content: '访客模式需要高级或无限通行证，请先获取对应通行证。',
						showCancel: false
					})
					return
				}

				// 3. 检查登录状态
				const userId = this.userInfo.userId
				if (!userId) {
					uni.reLaunch({ url: '/pages/login/login' })
					return
				}

				// 4. 记录本次操作：开启或关闭
				const targetMode = !this.isDemoMode

				uni.showModal({
					title: targetMode ? '进入访客模式' : '退出访客模式',
					editable: true,
					placeholderText: targetMode
						? '请输入访客激活码'
						: '请输入访客激活码以退出',
					success: async (res) => {
						// 点击取消，不改变当前状态
						if (!res.confirm) return

						const inputPwd = (res.content || '').trim()
						if (!inputPwd) {
							uni.showToast({
								title: '请输入访客激活码',
								icon: 'none'
							})
							return
						}

						uni.showLoading({ title: '校验中...' })

						try {
							const r = await uniCloud.callFunction({
								name: 'checkDemoPassword',
								data: {
									user_id: userId,
									password: inputPwd
								}
							})

							// 校验期间如果切换了账号，不更新状态
							const currentUser = uni.getStorageSync('userInfo')
							if (!currentUser || currentUser.userId !== userId) {
								return
							}

							// 校验期间若资格信息发生变化，也不切换
							const stillQualified =
								this.passLevel === 'high' ||
								this.passLevel === 'unlimited'

							if (!this.passInfoLoaded || !stillQualified) {
								uni.showToast({
									title: '通行证状态已变化，请重新操作',
									icon: 'none'
								})
								return
							}

							const result = r.result
							if (!result || result.code !== 200) {
								uni.showToast({
									title: result?.msg || '校验失败，请重试',
									icon: 'none'
								})
								return
							}

							// 5. 激活码正确，才真正修改状态
							if (targetMode) {
								uni.setStorageSync('isDemoMode', true)
							} else {
								uni.removeStorageSync('isDemoMode')
							}

							this.isDemoMode = targetMode

							uni.showToast({
								title: targetMode
									? '已进入访客模式'
									: '已退出访客模式',
								icon: 'success'
							})
						} catch (e) {
							console.error('切换访客模式失败：', e)
							uni.showToast({
								title: '网络异常，请稍后重试',
								icon: 'none'
							})
						} finally {
							uni.hideLoading()
						}
					}
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
	.pass-tag {
	    font-size: 12px;
	    padding: 2px 8px;
	    border-radius: 10px;
	    color: #fff;
	    margin-left: 8px;
	}
	.demo-btn {
		/* 固定在名字和加号中间，或者你直接写 margin-left 调整位置 */
		margin-left: 20px;
		padding: 6px 12px;
		background-color: #e6f0ff;
		color: #007aff;
		font-size: 14px;
		font-weight: bold;
		border-radius: 15px;
		border: 1px solid #007aff;
	}
	.tag-none { background-color: #999; }
	.tag-normal { background-color: #34c759; } /* 绿色 */
	.tag-high { background-color: #007aff; }   /* 蓝色 */
	.tag-unlimited { background-color: #F5B041; } /* add8e6 */
</style>
