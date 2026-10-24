<template>
	<view class="container">
		<!-- 顶部标题区：左侧 logo 占位 + 右侧文字 -->
		<view class="header">
			<!-- logo -->
			<image class="logo" src="/static/logo.jpeg" mode="aspectFit"></image>
			<view class="title-group">
				<text class="title">智小二</text>
				<text class="subtitle">智能作业解决方案</text>
			</view>
		</view>

		<!-- 表单区域（居中，约占三分之一宽度） -->
		<view class="form-box">
			<!-- 学号 -->
			<input class="input" v-model="formData.userId" placeholder="请输入学号" />

			<!-- 姓名（仅注册时显示） -->
			<input v-if="isRegister" class="input" v-model="formData.name" placeholder="请输入姓名" />

			<!-- 密码 -->
			<input class="input" v-model="formData.password" type="password" placeholder="请输入密码" />

			<view class="remember-row" v-if="!isRegister">
				<view class="checkbox" :class="{ checked: rememberMe }" @click="rememberMe = !rememberMe">
					<text v-if="rememberMe">✓</text>
				</view>
				<text class="remember-text" @click="rememberMe = !rememberMe">记住密码</text>
			</view>

			<!-- 主按钮 -->
			<button class="btn-primary" @click="handleSubmit">
				{{ isRegister ? '注 册' : '登 录' }}
			</button>

			<!-- 切换链接 -->
			<view class="toggle-link" @click="toggleMode">
				<text>{{ isRegister ? '已有账号？点此登录' : '没有账号？点此注册' }}</text>
			</view>

			<view class="tutorial-link" @click="goTutorial">
			    <text>点击查看功能介绍</text>
			</view>

		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				isRegister: false,
				rememberMe: false,
				formData: {
					userId: '',
					name: '',
					password: ''
				}
			}
		},
		onLoad() {
			const saved = uni.getStorageSync('rememberedLogin')
			if (saved && saved.userId && saved.password) {
				this.formData.userId = saved.userId
				this.formData.password = saved.password
				this.rememberMe = true
			}
		},
		methods: {
			toggleMode() {
				this.isRegister = !this.isRegister
				this.formData = { userId: '', name: '', password: '' }
			},

			goTutorial() {
			    uni.navigateTo({ url: '/pages/tutorial/tutorial' })
			},

			async handleSubmit() {
				if (!this.formData.userId || !this.formData.password) {
					uni.showToast({ title: '请填写学号和密码', icon: 'none' })
					return
				}
				if (this.isRegister && !this.formData.name) {
					uni.showToast({ title: '请填写姓名', icon: 'none' })
					return
				}

				const functionName = this.isRegister ? 'register' : 'login'
				const params = this.isRegister
					? { userId: this.formData.userId, password: this.formData.password, name: this.formData.name, role: 'student' }
					: { userId: this.formData.userId, password: this.formData.password }

				uni.showLoading({ title: this.isRegister ? '注册中...' : '登录中...' })

				try {
					const res = await uniCloud.callFunction({
						name: functionName,
						data: params
					})

					uni.hideLoading()

					if (res.result.code === 200) {
						uni.showToast({ title: res.result.msg })

						if (!this.isRegister) {
							// 处理"记住密码"
							if (this.rememberMe) {
								uni.setStorageSync('rememberedLogin', {
									userId: this.formData.userId,
									password: this.formData.password
								})
							} else {
								uni.removeStorageSync('rememberedLogin')
							}

							uni.setStorageSync('userInfo', res.result.data)
							setTimeout(() => {
								uni.reLaunch({ url: '/pages/home/home' })
							}, 1000)
						} else {
							setTimeout(() => {
								this.toggleMode()
							}, 1000)
						}
					} else {
						// 👇 新增：处理失败情况（密码错误、账号不存在等）
						uni.showToast({
							title: res.result.msg || '操作失败',
							icon: 'none'
						})
					}

				} catch (e) {
					uni.hideLoading()
					console.error('请求失败：', e)
					uni.showToast({ title: '网络异常，请重试', icon: 'none' })
				}
			}
		}
	}
</script>

<style>
	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 100vh;
		background-color: #f5f7fa;
		padding: 60px 20px 0;
		box-sizing: border-box;
	}

	/* 顶部标题区：横向排列 */
	.header {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 60px;
	}

	/* logo 占位方框 */
	.logo {
	    width: 70px;
	    height: 70px;
	    margin-right: 20px;
	}

	/* 标题文字组 */
	.title-group {
		display: flex;
		flex-direction: column;
	}

	.title {
		font-size: 40px;
		font-weight: bold;
		color: #007aff;
	}

	.subtitle {
		font-size: 16px;
		color: #666;
		margin-top: 8px;
	}

	/* 表单框：约占页面三分之一宽度，居中 */
	.form-box {
		width: 100%;
		max-width: 500px;
		background-color: #ffffff;
		padding: 35px 30px;
		border-radius: 15px;
		box-shadow: 0 4px 20px rgba(0,0,0,0.06);
		box-sizing: border-box;
	}

	.tutorial-link {
	    text-align: center;
	    margin-top: 15px;
	    color: #007aff;
	    font-size: 14px;
	}

	.input {
		height: 55px;
		border-bottom: 1px solid #eee;
		margin-bottom: 25px;
		font-size: 17px;
	}

	.btn-primary {
		background-color: #007aff;
		color: #ffffff;
		border-radius: 30px;
		font-size: 18px;
		margin-top: 15px;
	}

	.toggle-link {
		text-align: center;
		margin-top: 25px;
		color: #007aff;
		font-size: 14px;
	}
	.remember-row {
		display: flex;
		align-items: center;
		margin-bottom: 20px;
	}
	.checkbox {
		width: 18px;
		height: 18px;
		border: 2px solid #ccc;
		border-radius: 4px;
		margin-right: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		color: #fff;
	}
	.checkbox.checked {
		background-color: #007aff;
		border-color: #007aff;
	}
	.remember-text {
		font-size: 13px;
		color: #666;
	}
</style>
