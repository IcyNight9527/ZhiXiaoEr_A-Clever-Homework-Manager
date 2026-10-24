<template>
	<view class="container">
		<!-- 顶部统计 -->
		<view class="header">
			<view class="title">群组成员</view>
			<view class="stats">共 {{ members.length }} 人</view>
		</view>

		<!-- 成员列表 -->
		<view class="member-list">
			<view class="member-card" v-for="m in members" :key="m.user_id">
				<view class="member-info">
					<view class="name-row">
						<text class="name">{{ m.name }}</text>
						<text class="tag tag-creator" v-if="m.is_creator">创建者</text>
						<text class="tag tag-admin" v-else-if="m.is_admin">管理员</text>
					</view>
					<view class="uid">{{ m.user_id }}</view>
				</view>

				<view class="member-actions" v-if="isCreator && !m.is_creator">
					<!-- 设为/撤销管理员 -->
					<text
						v-if="m.is_admin"
						class="action-btn remove-admin"
						@click="setAdmin(m, 'remove')"
					>撤销管理员</text>
					<text
						v-else
						class="action-btn set-admin"
						@click="setAdmin(m, 'add')"
					>设为管理员</text>

					<!-- 移出群组 -->
					<text
						class="action-btn remove-member"
						@click="removeMember(m)"
					>移出</text>
				</view>
			</view>
		</view>

		<view class="empty" v-if="members.length === 0">暂无成员</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				group_id: '',
				members: [],
				isCreator: false
			}
		},
		onLoad(options) {
			this.group_id = options.group_id || ''
			this.loadData()
		},
		onShow() {
			this.loadMembers()
		},
		methods: {
			async loadMembers() {
				try {
					const userInfo = uni.getStorageSync('userInfo')

					// 1. 查群组详情，判断我是不是创建者
					const gRes = await uniCloud.callFunction({
						name: 'getGroupDetail',
						data: { group_id: this.group_id, user_id: userInfo.userId }
					})
					if (gRes.result.code === 200) {
						this.isCreator = gRes.result.data.myIdentity.is_creator
					}

					// 2. 查成员列表
					const res = await uniCloud.callFunction({
						name: 'getGroupMember',
						data: { group_id: this.group_id }
					})
					if (res.result.code === 200) {
						this.members = res.result.data || []
					}
				} catch (e) {
					console.error('加载成员失败：', e)
				}
			},

			// 任命/撤销管理员
			setAdmin(m, action) {
				const actionText = action === 'add' ? '任命' : '撤销'
				uni.showModal({
					title: '确认' + actionText,
					content: `确定要${actionText} ${m.name} 为管理员吗？`,
					success: async (res) => {
						if (res.confirm) {
							const userInfo = uni.getStorageSync('userInfo')
							uni.showLoading({ title: '处理中...' })
							try {
								const r = await uniCloud.callFunction({
									name: 'setGroupAdmin',
									data: {
										group_id: this.group_id,
										creator_id: userInfo.userId,
										target_user_id: m.user_id,
										action: action
									}
								})
								uni.hideLoading()
								if (r.result.code === 200) {
									uni.showToast({ title: r.result.msg })
									this.loadMembers()
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

			// 移出成员
			removeMember(m) {
				uni.showModal({
					title: '⚠️ 移出成员',
					content: `移出后，${m.name} 的所有提交记录也会被删除，确定吗？`,
					confirmColor: '#ff3b30',
					success: async (res) => {
						if (res.confirm) {
							const userInfo = uni.getStorageSync('userInfo')
							uni.showLoading({ title: '处理中...' })
							try {
								const r = await uniCloud.callFunction({
									name: 'removeGroupMember',
									data: {
										group_id: this.group_id,
										creator_id: userInfo.userId,
										target_user_id: m.user_id
									}
								})
								uni.hideLoading()
								if (r.result.code === 200) {
									uni.showToast({ title: '已移出' })
									this.loadMembers()
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
			}
		}
	}
</script>

<style>
	.container { padding: 20px; background-color: #f5f7fa; min-height: 100vh; }
	.header { margin-bottom: 20px; }
	.title { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 6px; }
	.stats { font-size: 13px; color: #999; }

	.member-card {
		background-color: #fff;
		border-radius: 12px;
		padding: 18px;
		margin-bottom: 12px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	}
	.member-info { margin-bottom: 12px; }
	.name-row { display: flex; align-items: center; margin-bottom: 6px; }
	.name { font-size: 16px; font-weight: bold; color: #333; margin-right: 10px; }
	.tag {
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 10px;
		color: #fff;
	}
	.tag-creator { background-color: #007aff; }
	.tag-admin { background-color: #34c759; }
	.uid { font-size: 13px; color: #999; }

	.member-actions { display: flex; flex-wrap: wrap; }
	.action-btn {
		display: inline-block;
		font-size: 13px;
		padding: 6px 16px;
		border-radius: 15px;
		margin-right: 10px;
		align-self: flex-start;
	}
	.set-admin { background-color: #e6f0ff; color: #007aff; }
	.remove-admin { background-color: #fff8e1; color: #ff8f00; }
	.remove-member { background-color: #ffe5e5; color: #ff3b30; }

	.empty { text-align: center; color: #999; padding: 60px 0; font-size: 14px; }
</style>
