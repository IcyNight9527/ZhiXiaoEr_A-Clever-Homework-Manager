<template>
	<view class="container">
		<!-- 顶部：群组名 + 身份 -->
		<!-- 群组信息卡片 -->
		<view class="info-card" v-if="loaded">
			<view class="info-name">{{ groupInfo.name }}</view>
			<view class="info-code" v-if="groupInfo.group_code">
				<text>群组号：{{ groupInfo.group_code }}</text>
				<text v-if="isCreator"> · 密码：{{ groupInfo.group_password }}</text>
			</view>
			<view class="info-identity">
				<text :class="isCreator ? 'tag-blue' : 'tag-green'">{{ isCreator ? '创建者' : '成员' }}</text>
				<text v-if="myIdentity.is_admin" :class="myIdentity.admin_in_group ? 'tag-green' : 'tag-red'">
					· {{ myIdentity.admin_in_group ? '需要交作业' : '不需要交作业' }}
				</text>
				<text :class="myIdentity.is_admin ? 'tag-blue' : 'tag-green'">
					· {{ myIdentity.is_admin ? '管理员' : '学生' }}
				</text>
			</view>
			<view class="info-actions">
				<text v-if="isCreator" class="info-btn" style="background-color: #e6f0ff; color: #007aff;" @click="editGroupName">修改群名</text>
				<text class="action-btn"style="background-color: #e6f0ff; color: #007aff;"@click="goMembers">{{ isCreator ? '成员管理' : '成员查看' }}</text>
				<text v-if="isCreator" class="info-btn" style="background-color: #ffe5e5; color: #ff3b30;" @click="dismissGroup">解散群组</text>
				<text v-if="!isCreator" class="info-btn" style="background-color: #ffe5e5; color: #ff3b30;" @click="leaveGroup">退出群组</text>
			</view>
		</view>

		<view class="info-card skeleton" v-else>
			<view class="skeleton-line"></view>
			<view class="skeleton-line short"></view>
		</view>

		<!-- 管理员专属按钮 -->
		<view class="admin-actions" v-if="myIdentity.is_admin">
			<button class="admin-action-btn" @click="goAddHomework">发布作业</button>
			<button class="admin-action-btn" @click="goAddNotification">发通知</button>
		</view>

		<!-- 通知区 -->
		<view class="notice-title">群组通知</view>
		<view class="notice-section" v-if="notices.length > 0">
			<view class="notice-item" v-for="(n, i) in notices" :key="i">
				<view class="notice-body">
					<text class="notice-time">发布时间：{{ formatFullTime(n.created_at) }}</text>
					<text class="notice-content">{{ n.content }}</text>
				</view>
				<text
					v-if="myIdentity.is_admin"
					class="notice-delete"
					@click="deleteNotice(n._id)"
				>删除</text>
			</view>
		</view>
		<view class="empty-box" v-else>暂无通知</view>

		<!-- 作业区 -->
		<view class="board-title">作业列表</view>
		<view class="homework-list" v-if="homeworkList.length > 0">
			<view class="homework-card" v-for="hw in homeworkList" :key="hw._id">
				<view class="card-header">
					<text class="subject">{{ hw.subject }}</text>
					<!-- 需要提交 + 我确实要交作业：显示已交/未交 -->
					<text
						v-if="hw.need_submit !== false && canSubmit"
						class="status"
						:class="isSubmitted(hw._id) ? 'status-done' : 'status-undone'"
					>
						{{ isSubmitted(hw._id) ? '✅ 已提交' : '❌ 未提交' }}
					</text>
					<!-- 需要提交 + 我不用交（老师）：不显示状态 -->
					<text
						v-else-if="hw.need_submit !== false && !canSubmit"
						class="status status-info"
					></text>
					<!-- 不需要提交：显示"无需提交" -->
					<text v-else class="status status-info">无需提交 / 线下提交</text>
				</view>
				<view class="card-title">{{ hw.desc }}</view>
				<!-- 作业图片 -->
				<view class="hw-images" v-if="hw.images && hw.images.length > 0">
					<image
						v-for="(img, i) in hw.images"
						:key="i"
						:src="img"
						mode="aspectFill"
						class="hw-img"
						@click="previewHwImage(hw.images, i)"
					/>
				</view>

				<!-- 作业文件 -->
				<view class="hw-file" v-if="hw.file_url">
					<text class="file-name">📎 {{ hw.file_name }}</text>
					<text class="file-download" @click="downloadHwFile(hw.file_url, hw.file_name)">下载</text>
				</view>
				<view class="card-deadline" :class="{ 'deadline-urgent': isUrgent(hw.deadline), 'deadline-expired': isExpired(hw.deadline) }">
					{{ isExpired(hw.deadline) ? '⚠️ 已截止：' : '截止：' }}{{ formatFullTime(hw.deadline) }}
				</view>

				<view class="card-btns" :class="{ 'single-btn': getBtnCount(hw) === 1 }">
					<!-- 需要提交 + 未提交 → 提交作业 -->
					<button
						v-if="canSubmit && hw.need_submit !== false && !isSubmitted(hw._id)"
						class="btn-small btn-blue"
						@click="goToSubmit(hw)"
					>提交作业</button>

					<!-- 需要提交 + 已提交 → 删除提交 -->
					<button
						v-if="canSubmit && hw.need_submit !== false && isSubmitted(hw._id)"
						class="btn-small btn-red"
						@click="deleteMySubmissionByHw(hw)"
					>删除提交</button>

					<!-- 管理员 → 查看提交情况 -->
					<button
						v-if="myIdentity.is_admin && hw.need_submit !== false"
						class="btn-small btn-blue"
						@click="goToSubmissions(hw)"
					>提交情况</button>

					<!-- 管理员 → 编辑作业 -->
					<button
						v-if="myIdentity.is_admin"
						class="btn-small btn-blue"
						@click="goEditHomework(hw)"
					>编辑作业</button>

					<!-- 管理员 → 删除作业 -->
					<button
						v-if="myIdentity.is_admin"
						class="btn-small btn-red"
						@click="deleteHw(hw._id)"
					>删除作业</button>
				</view>
			</view>
		</view>
		<view class="empty-box" v-else>暂无作业</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				group_id: '',
				groupInfo: {},
				myIdentity: { is_admin: false, admin_in_group: false },
				homeworkList: [],
				notices: [],
				mySubmissions: [],
				userInfo: {},
				loaded: false
			}
		},
		computed: {
			canSubmit() {
				if (!this.myIdentity.is_admin) return true
				return this.myIdentity.admin_in_group === true
			},
			isCreator() {
				return this.groupInfo.admin_id === this.userInfo.userId
			}
		},
		onLoad(options) {
			this.group_id = options.id
		},
		onShow() {
		    const info = uni.getStorageSync('userInfo')
		    if (info) this.userInfo = info
		    this.loadData()
		},
		methods: {
			async loadData() {
				const userInfo = uni.getStorageSync('userInfo')
				if (!userInfo) {
					uni.reLaunch({ url: '/pages/login/login' })
					return
				}
				try {
					// 1. 查群组详情 + 我的身份
					const gRes = await uniCloud.callFunction({
						name: 'getGroupDetail',
						data: { group_id: this.group_id, user_id: userInfo.userId }
					})
					if (gRes.result.code !== 200) {
						uni.showToast({ title: gRes.result.msg, icon: 'none' })
						return
					}
					this.groupInfo = gRes.result.data.group
					this.myIdentity = gRes.result.data.myIdentity

					// 2. 查作业
					// 2. 查作业
					const hwRes = await uniCloud.callFunction({
						name: 'getHomework',
						data: { group_id: this.group_id }
					})
					const list = hwRes.result.data || []

					// 收集所有 fileID
					const allFileIDs = []
					list.forEach(hw => {
						if (hw.images && hw.images.length > 0) {
							allFileIDs.push(...hw.images)
						}
						if (hw.file_url) {
							allFileIDs.push(hw.file_url)
						}
					})

					// 换取临时链接
					if (allFileIDs.length > 0) {
						const tempRes = await uniCloud.getTempFileURL({ fileList: allFileIDs })
						const urlMap = {}
						tempRes.fileList.forEach(item => {
							urlMap[item.fileID] = item.tempFileURL
						})

						// 替换 fileID 为 tempFileURL
						list.forEach(hw => {
							if (hw.images) {
								hw.images = hw.images.map(id => urlMap[id] || id)
							}
							if (hw.file_url) {
								hw.file_url = urlMap[hw.file_url] || hw.file_url
							}
						})
					}

					this.homeworkList = list

					// 3. 查通知
					const nRes = await uniCloud.callFunction({
						name: 'getNotification',
						data: { group_id: this.group_id }
					})
					this.notices = nRes.result.data || []

					// 4. 查我的提交
					const sRes = await uniCloud.callFunction({
						name: 'getMySubmission',
						data: { student_id: userInfo.userId }
					})
					this.mySubmissions = sRes.result.data || []
					this.loaded = true
				} catch (e) {
					console.error('加载失败：', e)
				}
			},

			isSubmitted(hwId) {
				return this.mySubmissions.some(s => s.homework_id === hwId)
			},
			getBtnCount(hw) {
				let count = 0
				// 提交作业 / 删除提交
				if (this.canSubmit && hw.need_submit !== false) count++
				// 提交情况
				if (this.myIdentity.is_admin && hw.need_submit !== false) count++
				// 编辑作业
				if (this.myIdentity.is_admin) count++
				// 删除作业
				if (this.myIdentity.is_admin) count++
				return count
			},
			editGroupName() {
				uni.showModal({
					title: '修改群组名',
					editable: true,
					placeholderText: '请输入新的群组名',
					success: async (res) => {
						if (!res.confirm || !res.content) return
						const newName = res.content.trim()
						if (!newName) {
							uni.showToast({ title: '名称不能为空', icon: 'none' })
							return
						}
						const userInfo = uni.getStorageSync('userInfo')
						uni.showLoading({ title: '保存中...' })
						try {
							const r = await uniCloud.callFunction({
								name: 'updateGroup',
								data: {
									group_id: this.group_id,
									user_id: userInfo.userId,
									new_name: newName
								}
							})
							uni.hideLoading()
							if (r.result.code === 200) {
								uni.showToast({ title: '修改成功！' })
								this.loadData()
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
			previewHwImage(urls, index) {
				uni.previewImage({
					urls: urls,
					current: index
				})
			},

			downloadHwFile(url, name) {
				// #ifdef H5
				window.open(url)
				// #endif

				// #ifndef H5
				uni.showLoading({ title: '下载中...' })
				uni.downloadFile({
					url: url,
					success: (res) => {
						uni.saveFile({
							tempFilePath: res.tempFilePath,
							success: () => {
								uni.hideLoading()
								uni.showToast({ title: '已保存到本地', icon: 'success' })
							},
							fail: () => {
								uni.hideLoading()
								uni.showToast({ title: '保存失败', icon: 'none' })
							}
						})
					},
					fail: () => {
						uni.hideLoading()
						uni.showToast({ title: '下载失败', icon: 'none' })
					}
				})
				// #endif
			},
			formatTime(t) {
				if (!t) return '不限'
				const d = new Date(t)
				return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
			},
			goMembers() {
				uni.navigateTo({
					url: `/pages/group/members?group_id=${this.group_id}`
				})
			},
			// 完整时间（含时分）
			formatFullTime(t) {
				if (!t) return '不限'
				const d = new Date(t)
				return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
			},

			// 是否已截止
			isExpired(t) {
				return t && Date.now() > t
			},

			// 是否临近截止（24小时内）
			isUrgent(t) {
				if (!t) return false
				const diff = t - Date.now()
				return diff > 0 && diff < 24 * 60 * 60 * 1000
			},

			goEditHomework(hw) {
				uni.navigateTo({
					url: `/pages/admin/edit_homework?homework_id=${hw._id}&group_id=${this.group_id}`
				})
			},

			goToSubmit(hw) {
				// #ifdef APP-PLUS
				uni.showModal({
					title: '提示',
					content: '文件提交请在电脑端完成，手机端可查看作业详情和提交情况。',
					showCancel: false
				})
				return
				// #endif

				// H5 端：正常跳转
				uni.navigateTo({
						url: `/pages/submit/submit?id=${hw._id}&subject=${hw.subject}&desc=${hw.desc}&ext=${hw.allowed_ext.join(',')}&group_id=${this.group_id}`
					})
			},

			goToSubmissions(hw) {
				uni.navigateTo({
					url: `/pages/admin/submissions?homework_id=${hw._id}&group_id=${this.group_id}&title=${hw.title}`
				})
			},

			goAddHomework() {
				uni.navigateTo({
					url: `/pages/admin/add_homework?group_id=${this.group_id}`
				})
			},

			goAddNotification() {
				uni.navigateTo({
					url: `/pages/admin/add_notification?group_id=${this.group_id}`
				})
			},


			deleteHw(id) {
				uni.showModal({
					title: '确认删除',
					content: '删除作业会同时删除所有提交记录，确定吗？',
					confirmColor: '#ff3b30',
					success: async (res) => {
						if (res.confirm) {
							const userInfo = uni.getStorageSync('userInfo')
							uni.showLoading({ title: '删除中...' })
							try {
								const r = await uniCloud.callFunction({
									name: 'deleteHomework',
									data: { homework_id: id, user_id: userInfo.userId, group_id: this.group_id }
								})
								uni.hideLoading()
								if (r.result.code === 200) {
									uni.showToast({ title: '已删除' })
									this.loadData()
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

			deleteNotice(id) {
				uni.showModal({
					title: '确认删除',
					content: '确定要删除这条通知吗？',
					confirmColor: '#ff3b30',
					success: async (res) => {
						if (res.confirm) {
							const userInfo = uni.getStorageSync('userInfo')
							const r = await uniCloud.callFunction({
								name: 'deleteNotification',
								data: { notification_id: id, user_id: userInfo.userId, group_id: this.group_id }
							})
							if (r.result.code === 200) {
								uni.showToast({ title: '已删除' })
								this.loadData()
							} else {
								uni.showToast({ title: r.result.msg, icon: 'none' })
							}
						}
					}
				})
			},

			dismissGroup() {
				uni.showModal({
					title: '⚠️ 解散群组',
					content: '解散后，所有作业、通知、提交记录都会被删除，且无法恢复。确定吗？',
					confirmColor: '#ff3b30',
					success: async (res) => {
						if (res.confirm) {
							const userInfo = uni.getStorageSync('userInfo')
							uni.showLoading({ title: '解散中...' })
							const r = await uniCloud.callFunction({
								name: 'leaveGroup',
								data: { user_id: userInfo.userId, group_id: this.group_id }
							})
							uni.hideLoading()
							if (r.result.code === 200) {
								uni.showToast({ title: '群组已解散' })
								setTimeout(() => {
									uni.reLaunch({ url: '/pages/home/home' })
								}, 1000)
							} else {
								uni.showToast({ title: r.result.msg, icon: 'none' })
							}
						}
					}
				})
			},
			// 删除我的提交（直接根据作业ID找提交记录）
			deleteMySubmissionByHw(hw) {
				const sub = this.mySubmissions.find(s => s.homework_id === hw._id)
				if (!sub) {
					uni.showToast({ title: '未找到提交记录', icon: 'none' })
					return
				}

				uni.showModal({
					title: '确认删除',
					content: '删除后需要重新提交，确定吗？',
					confirmColor: '#ff3b30',
					success: async (res) => {
						if (res.confirm) {
							const userInfo = uni.getStorageSync('userInfo')
							uni.showLoading({ title: '删除中...' })
							try {
								const r = await uniCloud.callFunction({
									name: 'deleteMySubmission',
									data: { submission_id: sub._id, user_id: userInfo.userId }
								})
								uni.hideLoading()
								if (r.result.code === 200) {
									uni.showToast({ title: '已删除' })
									this.loadData()   // 👈 刷新数据，状态自动变回“未提交”
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
			leaveGroup() {
				uni.showModal({
					title: '确认退出',
					content: '确定要退出这个群组吗？',
					success: async (res) => {
						if (res.confirm) {
							const userInfo = uni.getStorageSync('userInfo')
							const r = await uniCloud.callFunction({
								name: 'leaveGroup',
								data: { user_id: userInfo.userId, group_id: this.group_id }
							})
							if (r.result.code === 200) {
								uni.showToast({ title: '已退出' })
								setTimeout(() => {
									uni.reLaunch({ url: '/pages/home/home' })
								}, 1000)
							} else {
								uni.showToast({ title: r.result.msg, icon: 'none' })
							}
						}
					}
				})
			}
		}
	}
</script>

<style>
	.container {
		padding: 20px;
		background-color: #f5f7fa;
		min-height: 100vh;
		box-sizing: border-box;
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
	}

	.info-card {
		background-color: #fff;
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 20px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
		text-align: center;
	}
	.info-name {
		font-size: 24px;
		font-weight: bold;
		color: #333;
		margin-bottom: 12px;
	}
	.info-identity {
		font-size: 14px;
		margin-bottom: 15px;
	}
	.info-identity text { font-size: 14px; font-weight: bold; }
	.tag-red { color: #ff3b30; }
	.tag-green { color: #34c759; }
	.tag-blue { color: #007aff; }

	.info-actions {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 12px;
	}
	.info-btn {
		display: inline-block;
		font-size: 14px;
		font-weight: bold;
		padding: 8px 20px;
		border-radius: 18px;
		white-space: nowrap;
	}
	.card-btns {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.card-btns.single-btn {
		justify-content: center;
	}
	.skeleton { text-align: center; }
	.skeleton-line {
		height: 24px;
		background-color: #eee;
		border-radius: 6px;
		margin: 10px auto;
		width: 60%;
	}
	.skeleton-line.short { height: 16px; width: 40%; }
	.identity-line {
		font-size: 14px;
		margin-bottom: 15px;
	}
	.tag-red { color: #ff3b30; }
	.tag-green { color: #34c759; }
	.tag-blue { color: #007aff; }

	.skeleton { text-align: center; }
	.skeleton-line {
		height: 24px;
		background-color: #eee;
		border-radius: 6px;
		margin: 10px auto;
		width: 60%;
	}
	.skeleton-line.short { height: 16px; width: 40%; }
	.leave-btn {
		display: inline-block;
		font-size: 14px;
		font-weight: bold;
		color: #ff3b30;
		background-color: #ffe5e5;
		padding: 6px 20px;
		border-radius: 20px;
	}

	.admin-actions { display: flex; margin-bottom: 20px; }

	.notice-title, .board-title {
		font-size: 16px;
		font-weight: bold;
		color: #333;
		margin-bottom: 12px;
	}
	.notice-section {
		background-color: #fff8e1;
		border-left: 4px solid #ffb300;
		padding: 15px;
		border-radius: 8px;
		margin-bottom: 25px;
	}
	.notice-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		font-size: 14px;
		color: #666;
		line-height: 1.6;
		margin-bottom: 6px;
	}
	.notice-body { flex: 1; display: flex; flex-direction: column; }
	.notice-time { font-size: 12px; color: #999; margin-bottom: 4px; }
	.notice-content { font-size: 14px; color: #666; line-height: 1.6; }
	.notice-delete {
		font-size: 12px;
		color: #ff3b30;
		margin-left: 10px;
	}

	.empty-box {
		background-color: #fff;
		border-radius: 10px;
		padding: 30px;
		text-align: center;
		color: #999;
		font-size: 14px;
		margin-bottom: 25px;
	}

	.homework-card {
		background-color: #fff;
		border-radius: 12px;
		padding: 18px;
		margin-bottom: 15px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	}
	.card-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
	.subject { font-size: 14px; color: #007aff; font-weight: bold; }
	.status { font-size: 13px; }
	.status-done { color: #34c759; }
	.status-undone { color: #ff3b30; }
	.status-info { color: #ff8f00; }
	.card-title { font-size: 17px; font-weight: bold; color: #333; margin-bottom: 10px; }
	.card-deadline { font-size: 13px; color: #999; margin-bottom: 12px; }
	.deadline-urgent { color: #ff8f00; font-weight: bold; }
	.deadline-expired { color: #ff3b30; font-weight: bold; }

	.admin-action-btn {
		flex: 1;
		background-color: #007aff;
		color: #fff;
		font-size: 14px;
		border-radius: 20px;
		margin-right: 10px;
	}
	.action-btn {
		display: inline-block;
		font-size: 14px;
		font-weight: bold;
		padding: 8px 20px;
		border-radius: 18px;
		white-space: nowrap;
	}
	.admin-action-btn:last-child { margin-right: 0; }

	.card-btns {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.info-code {
		font-size: 13px;
		color: #999;
		margin-bottom: 12px;
	}
	.btn-small {
		width: calc(50% - 5px);   /* 两个按钮一行 */
		box-sizing: border-box;
		font-size: 13px;
		border-radius: 18px;
		height: 34px;
		line-height: 34px;
		margin: 0;
		padding: 0;
	}

	.btn-blue {
		background-color: #e6f0ff;
		color: #007aff;
	}
	.btn-red {
		background-color: #ffe5e5;
		color: #ff3b30;
	}
	.hw-images {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 10px;
	}
	.hw-img {
		width: 80px;
		height: 80px;
		border-radius: 6px;
	}
	.hw-file {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: #f5f7fa;
		padding: 10px 14px;
		border-radius: 8px;
		margin-bottom: 10px;
	}
	.file-name {
		font-size: 13px;
		color: #333;
	}
	.file-download {
		font-size: 13px;
		color: #007aff;
		font-weight: bold;
	}
	.btn-submit { background-color: #007aff; color: #fff; }
	.btn-view { background-color: #f0f0f0; color: #333; }
	.btn-delete { background-color: #ffe5e5; color: #ff3b30; }
	.btn-delete-my { background-color: #ffe5e5; color: #ff3b30; }
	.btn-edit { background-color: #e6f0ff; color: #007aff; }
</style>
