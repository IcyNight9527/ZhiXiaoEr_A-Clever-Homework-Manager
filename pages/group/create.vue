<template>
	<view class="container">
		<view class="form-box">

			<view class="form-item">
				<text class="label">群组名称</text>
				<input class="input" v-model="formData.name" placeholder="如：25级智科二班" />
			</view>

			<view class="form-item">
				<text class="label">群组号</text>
				<input class="input" v-model="formData.group_code" placeholder="4位数字，如：1001" maxlength="4" />
			</view>

			<view class="form-item">
				<text class="label">群组密码</text>
				<input class="input" v-model="formData.group_password" placeholder="6位数字" maxlength="6" />
				<text class="tip">学生加入群组时需要输入此密码</text>
			</view>

			<view class="form-item">
				<text class="label">是否加入统计范围</text>
				<view class="radio-group">
					<view
						class="radio-item"
						:class="{ active: formData.admin_in_group === true }"
						@click="formData.admin_in_group = true"
					>是（学委）</view>
					<view
						class="radio-item"
						:class="{ active: formData.admin_in_group === false }"
						@click="formData.admin_in_group = false"
					>否（老师）</view>
				</view>
				<text class="tip">选择“是”后，你也会被纳入作业提交统计。</text>
			</view>

			<button class="btn-primary" @click="handleCreate">创建群组</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				formData: {
					name: '',
					group_code: '',
					group_password: '',
					admin_in_group: true
				}
			}
		},
		methods: {
			async handleCreate() {
				if (!this.formData.name) {
					uni.showToast({ title: '请输入群组名称', icon: 'none' })
					return
				}
				if (!/^\d{4}$/.test(this.formData.group_code)) {
					uni.showToast({ title: '群组号必须是4位数字', icon: 'none' })
					return
				}

				if (!/^\d{6}$/.test(this.formData.group_password)) {
					uni.showToast({ title: '群组密码必须是6位数字', icon: 'none' })
					return
				}

				const userInfo = uni.getStorageSync('userInfo')
				if (!userInfo) {
					uni.reLaunch({ url: '/pages/login/login' })
					return
				}

				uni.showLoading({ title: '创建中...' })
				try {
					const res = await uniCloud.callFunction({
						name: 'createGroup',
						data: {
							name: this.formData.name,
							group_code: this.formData.group_code,
							group_password: this.formData.group_password,
							admin_id: userInfo.userId,
							admin_in_group: this.formData.admin_in_group
						}
					})
					uni.hideLoading()

					if (res.result.code === 200) {
						uni.showToast({ title: '创建成功！' })
						setTimeout(() => uni.navigateBack(), 1000)
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}

				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: '网络异常', icon: 'none' })
				}
			}
		}
	}
</script>

<style>
	.container { padding: 20px; background-color: #f5f7fa; min-height: 100vh; }
	.form-box {
		background-color: #fff;
		border-radius: 12px;
		padding: 25px;
		box-shadow: 0 2px 8px rgba(0,0,0,0.05);
	}
	.form-item { margin-bottom: 25px; }
	.label {
		font-size: 15px;
		color: #333;
		font-weight: bold;
		display: block;
		margin-bottom: 10px;
	}
	.input {
		height: 45px;
		background-color: #f5f7fa;
		border-radius: 8px;
		padding: 0 15px;
		font-size: 15px;
	}
	.radio-group { display: flex; margin-top: 5px; }
	.radio-item {
		flex: 1;
		text-align: center;
		padding: 12px 0;
		background-color: #f5f7fa;
		border-radius: 8px;
		font-size: 14px;
		color: #666;
		margin-right: 10px;
		border: 2px solid transparent;
	}
	.radio-item:last-child { margin-right: 0; }
	.radio-item.active {
		background-color: #e6f0ff;
		color: #007aff;
		border-color: #007aff;
		font-weight: bold;
	}
	.tip { font-size: 12px; color: #999; margin-top: 8px; display: block; }
	.btn-primary {
		background-color: #007aff;
		color: #fff;
		border-radius: 25px;
		font-size: 16px;
		margin-top: 10px;
	}
</style>
