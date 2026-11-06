<template>
	<view class="container">
		<!-- 问题反馈 -->
		<view class="section-card">
			<view class="section-header">
				<text class="section-title">问题反馈</text>
				<text class="remaining-text">
					今日还可提交 {{ remainingToday }} 次
				</text>
			</view>

			<text class="section-tip">
				请简要描述遇到的问题或遇到的bug；请勿填写账号密码、通行证号码等敏感信息。
			</text>

			<view class="category-list">
				<view
					class="category-item"
					v-for="item in categories"
					:key="item"
					:class="{ active: selectedCategory === item }"
					@click="selectedCategory = item"
				>
					{{ item }}
				</view>
			</view>

			<textarea
				class="feedback-input"
				v-model="content"
				maxlength="500"
				placeholder="例如：我忘了我的账号密码，需要找回"
			/>

			<view class="input-footer">
				<text class="input-tip">
					至少5个字符
				</text>
				<text class="input-count">
					{{ content.length }}/500
				</text>
			</view>

			<button
				class="submit-btn"
				:disabled="submitting || remainingToday <= 0"
				@click="submitFeedback"
			>
				{{ submitting ? '提交中...' : '提交反馈' }}
			</button>
		</view>

		<!-- 开发者回复 -->
		<view class="section-card">
			<view class="section-header">
				<text class="section-title">开发者回复</text>
				<text class="refresh-link" @click="loadFeedback">
					刷新
				</text>
			</view>

			<view class="loading-box" v-if="loading">
				正在加载反馈记录...
			</view>

			<view class="empty-box" v-else-if="feedbackList.length === 0">
				暂无反馈记录
			</view>

			<view class="feedback-list" v-else>
				<view
					class="feedback-item"
					v-for="item in feedbackList"
					:key="item._id"
				>
					<view class="feedback-header">
						<text class="feedback-category">
							{{ item.category }}
						</text>
						<text
							class="status-tag"
							:class="{ replied: hasReply(item) }"
						>
							{{ hasReply(item) ? '已回复' : '等待处理' }}
						</text>
					</view>

					<text class="feedback-time">
						提交时间：{{ formatTime(item.created_at) }}
					</text>

					<text class="feedback-content">
						{{ item.content }}
					</text>

					<view class="reply-box" v-if="hasReply(item)">
						<text class="reply-title">开发者回复</text>
						<text class="reply-content">{{ item.reply }}</text>
						<text class="reply-time" v-if="item.replied_at">
							回复时间：{{ formatTime(item.replied_at) }}
						</text>
					</view>

					<text class="pending-text" v-else>
						开发者暂未回复，请稍后再查看。
					</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userInfo: {},
			categories: [
				'账号与密码',
				'通行证相关',
				'bug上报',
				'其它'
			],
			selectedCategory: '账号与密码',
			content: '',
			submitting: false,
			loading: false,
			remainingToday: 3,
			feedbackList: []
		}
	},

	onShow() {
		const info = uni.getStorageSync('userInfo')

		if (!info || !info.userId) {
			uni.reLaunch({
				url: '/pages/login/login'
			})
			return
		}

		this.userInfo = info
		this.loadFeedback()
	},

	methods: {
		async loadFeedback() {
			if (!this.userInfo.userId) return

			this.loading = true

			try {
				const res = await uniCloud.callFunction({
					name: 'feedback',
					data: {
						action: 'list',
						user_id: this.userInfo.userId
					}
				})

				const result = res.result || {}

				if (result.code !== 200) {
					throw new Error(result.msg || '获取反馈失败')
				}

				const data = result.data || {}

				this.feedbackList = data.feedbacks || []
				this.remainingToday = Number(
					data.remaining_today || 0
				)
			} catch (error) {
				console.error('获取反馈失败：', error)

				uni.showToast({
					title: error.message || '获取反馈失败',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},

		async submitFeedback() {
			if (this.submitting) return

			const text = this.content.trim()

			if (text.length < 5) {
				uni.showToast({
					title: '反馈内容至少5个字符',
					icon: 'none'
				})
				return
			}

			if (this.remainingToday <= 0) {
				uni.showToast({
					title: '今天的反馈次数已用完',
					icon: 'none'
				})
				return
			}

			let platform = ''
			let clientVersion = ''

			// #ifdef APP-PLUS
			platform = 'App'
			clientVersion = plus.runtime.version
			// #endif

			// #ifdef H5
			platform = 'H5'
			// #endif

			this.submitting = true
			uni.showLoading({
				title: '提交中...',
				mask: true
			})

			try {
				const res = await uniCloud.callFunction({
					name: 'feedback',
					data: {
						action: 'submit',
						user_id: this.userInfo.userId,
						category: this.selectedCategory,
						content: text,
						platform,
						client_version: clientVersion
					}
				})

				const result = res.result || {}

				if (result.code === 429) {
					this.remainingToday = 0

					uni.showModal({
						title: '提交次数已用完',
						content: result.msg || '请明天再试',
						showCancel: false
					})
					return
				}

				if (result.code !== 200) {
					throw new Error(result.msg || '提交失败')
				}

				this.content = ''
				this.remainingToday = Number(
					result.data?.remaining_today || 0
				)

				uni.showToast({
					title: '问题提交成功',
					icon: 'success'
				})

				await this.loadFeedback()
			} catch (error) {
				console.error('提交反馈失败：', error)

				uni.showToast({
					title: error.message || '提交失败',
					icon: 'none'
				})
			} finally {
				this.submitting = false
				uni.hideLoading()
			}
		},

		hasReply(item) {
			return (
				typeof item.reply === 'string' &&
				item.reply.trim().length > 0
			)
		},

		formatTime(timestamp) {
			if (!timestamp) return ''

			const date = new Date(timestamp)

			const year = date.getFullYear()
			const month = String(date.getMonth() + 1).padStart(2, '0')
			const day = String(date.getDate()).padStart(2, '0')
			const hour = String(date.getHours()).padStart(2, '0')
			const minute = String(date.getMinutes()).padStart(2, '0')

			return `${year}-${month}-${day} ${hour}:${minute}`
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
	min-height: 100vh;
	background-color: #f5f7fa;
	box-sizing: border-box;
}

.section-card {
	width: 100%;
	background-color: #fff;
	border-radius: 12px;
	padding: 20px;
	margin-bottom: 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	box-sizing: border-box;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.section-title {
	font-size: 18px;
	font-weight: bold;
	color: #333;
}

.remaining-text {
	font-size: 12px;
	color: #999;
}

.section-tip {
	display: block;
	font-size: 13px;
	line-height: 1.6;
	color: #888;
	margin-bottom: 15px;
}

.category-list {
	display: flex;
	flex-wrap: wrap;
	margin-bottom: 10px;
}

.category-item {
	width: calc(50% - 5px);
	padding: 10px 8px;
	margin-bottom: 10px;
	background-color: #f5f7fa;
	border: 1px solid transparent;
	border-radius: 8px;
	color: #666;
	font-size: 14px;
	text-align: center;
	box-sizing: border-box;
}

.category-item:nth-child(odd) {
	margin-right: 10px;
}

.category-item.active {
	background-color: #e6f0ff;
	border-color: #007aff;
	color: #007aff;
	font-weight: bold;
}

.feedback-input {
	width: 100%;
	height: 130px;
	padding: 12px 14px;
	background-color: #f5f7fa;
	border-radius: 10px;
	font-size: 14px;
	line-height: 1.6;
	box-sizing: border-box;
}

.input-footer {
	display: flex;
	justify-content: space-between;
	margin: 8px 0 15px;
}

.input-tip,
.input-count {
	font-size: 12px;
	color: #999;
}

.submit-btn {
	width: 100%;
	height: 44px;
	line-height: 44px;
	margin: 0;
	background-color: #007aff;
	color: #fff;
	border-radius: 22px;
	font-size: 15px;
}

.submit-btn[disabled] {
	background-color: #b7d7fb;
	color: #fff;
}

.refresh-link {
	font-size: 13px;
	color: #007aff;
}

.loading-box,
.empty-box {
	padding: 30px 10px;
	text-align: center;
	font-size: 14px;
	color: #999;
}

.feedback-item {
	background-color: #f8f9fb;
	border-radius: 10px;
	padding: 15px;
	margin-bottom: 12px;
}

.feedback-item:last-child {
	margin-bottom: 0;
}

.feedback-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 6px;
}

.feedback-category {
	font-size: 15px;
	font-weight: bold;
	color: #333;
}

.status-tag {
	font-size: 11px;
	color: #ff8f00;
	background-color: #fff8e1;
	padding: 3px 8px;
	border-radius: 10px;
}

.status-tag.replied {
	color: #34c759;
	background-color: #eaf8ee;
}

.feedback-time {
	display: block;
	font-size: 12px;
	color: #999;
	margin-bottom: 10px;
}

.feedback-content {
	display: block;
	font-size: 14px;
	line-height: 1.7;
	color: #444;
	white-space: pre-wrap;
	word-break: break-word;
}

.reply-box {
	background-color: #eef5ff;
	border-left: 3px solid #007aff;
	border-radius: 8px;
	padding: 12px;
	margin-top: 12px;
}

.reply-title {
	display: block;
	font-size: 13px;
	font-weight: bold;
	color: #007aff;
	margin-bottom: 6px;
}

.reply-content {
	display: block;
	font-size: 14px;
	line-height: 1.7;
	color: #333;
	white-space: pre-wrap;
	word-break: break-word;
}

.reply-time {
	display: block;
	font-size: 11px;
	color: #999;
	margin-top: 8px;
}

.pending-text {
	display: block;
	font-size: 13px;
	color: #999;
	margin-top: 10px;
}
</style>
