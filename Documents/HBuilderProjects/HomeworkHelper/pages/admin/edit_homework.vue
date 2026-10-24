<template>
	<view class="container">
		<view class="form-box">
			<view class="form-item">
				<text class="label">科目</text>
				<input class="input" v-model="formData.subject" placeholder="如：数据库原理" />
			</view>

			<view class="form-item">
				<text class="label">作业内容</text>
				<textarea class="textarea" v-model="formData.desc" placeholder="请填写作业要求"></textarea>
			</view>

			<view class="form-item">
				<text class="label">作业图片（最多5张）</text>
				<view class="upload-list">
					<view class="upload-item" v-for="(img, i) in formData.images" :key="i">
						<image :src="img" mode="aspectFill" class="upload-img" @click="previewImg(i)" />
						<text class="upload-del" @click="removeImg(i)">×</text>
					</view>
					<view class="upload-add" v-if="formData.images.length < 5" @click="chooseImage">＋</view>
				</view>
			</view>

			<view class="form-item">
				<text class="label">作业文件（1个，仅电脑端）</text>
				<view class="upload-file" v-if="formData.file_name">
					<text>{{ formData.file_name }}</text>
					<text class="upload-del" @click="removeFile">×</text>
				</view>
				<button class="upload-btn" v-else @click="chooseFile">选择文件</button>
			</view>
			<view class="form-item">
				<text class="label">允许格式</text>
				<view class="ext-list">
					<view
						class="ext-item"
						v-for="(group, key) in extGroups"
						:key="key"
						:class="{
							active: isGroupActive(key),
							disabled: formData.allowed_ext.includes('all') && key !== 'all'
						}"
						@click="toggleExtGroup(key)"
					>{{ group.label }}</view>
				</view>
			</view>

			<view class="form-item">
				<text class="label">是否需要提交</text>
				<view class="radio-group">
					<view
						class="radio-item"
						:class="{ active: formData.need_submit === true }"
						@click="formData.need_submit = true"
					>需要提交</view>
					<view
						class="radio-item"
						:class="{ active: formData.need_submit === false }"
						@click="formData.need_submit = false"
					>无需提交或线下提交</view>
				</view>
			</view>

			<view class="form-item" v-if="formData.need_submit">

				<text class="label">文件重命名规则</text>
				<view class="radio-group">
					<view
						class="radio-item"
						:class="{ active: formData.rename_rule === 'id_name' }"
						@click="formData.rename_rule = 'id_name'"
					>学号+姓名</view>
					<view
						class="radio-item"
						:class="{ active: formData.rename_rule === 'name_id' }"
						@click="formData.rename_rule = 'name_id'"
					>姓名+学号</view>
					<view
						class="radio-item"
						:class="{ active: formData.rename_rule === 'keep' }"
						@click="formData.rename_rule = 'keep'"
					>保持原名</view>
				</view>
			</view>

			<view class="form-item">
				<text class="label">截止日期</text>
				<picker mode="date" :value="formData.deadlineText" @change="onDateChange">
					<view class="picker">{{ formData.deadlineText || '请选择日期' }}</view>
				</picker>
			</view>

			<view class="form-item">
				<text class="label">截止时间</text>
				<view class="radio-group">
					<view
						class="radio-item"
						:class="{ active: formData.timeType === '21:00' }"
						@click="formData.timeType = '21:00'"
					>21:00</view>
					<view
						class="radio-item"
						:class="{ active: formData.timeType === '22:00' }"
						@click="formData.timeType = '22:00'"
					>22:00</view>
					<view
						class="radio-item"
						:class="{ active: formData.timeType === 'custom' }"
						@click="formData.timeType = 'custom'"
					>自定义</view>
				</view>
			</view>

			<view class="form-item" v-if="formData.timeType === 'custom'">
				<text class="label">自定义时间</text>
				<picker mode="time" :value="formData.customTime" @change="onTimeChange">
					<view class="picker">{{ formData.customTime || '请选择时间' }}</view>
				</picker>
			</view>

			<button class="btn-primary" @click="handleSubmit">保存修改</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				homework_id: '',
				group_id: '',
				extGroups: {
					pdf: { label: 'PDF', exts: ['pdf'] },
					word: { label: 'WORD', exts: ['doc', 'docx'] },
					excel: { label: 'EXCEL', exts: ['xls', 'xlsx'] },
					ppt: { label: 'PPT', exts: ['ppt', 'pptx'] },
					image: { label: '图片或文本', exts: ['jpg', 'jpeg', 'png', 'txt'] },
					zip: { label: '压缩包', exts: ['zip', 'rar'] },   // 👈 新增
					all: { label: '不限', exts: [] }
				},
				formData: {
					subject: '',
					desc: '',
					allowed_ext: ['pdf'],
					deadlineText: '',
					deadline: 0,
					need_submit: true,
					rename_rule: 'id_name',
					timeType: '22:00',
					customTime: '22:00',
					images: [],
					file_url: '',
					file_name: ''
				}
			}
		},
		onLoad(options) {
			this.homework_id = options.homework_id || ''
			this.group_id = options.group_id || ''
			this.loadHomework()
		},
		methods: {
			async loadHomework() {
				try {
					const res = await uniCloud.callFunction({
						name: 'getHomework',
						data: { group_id: this.group_id }
					})
					const hw = (res.result.data || []).find(h => h._id === this.homework_id)
					if (!hw) {
						uni.showToast({ title: '作业不存在', icon: 'none' })
						return
					}
					this.formData.subject = hw.subject
					this.formData.desc = hw.desc || ''
					if (hw.images && hw.images.length > 0) {
						const tempRes = await uniCloud.getTempFileURL({ fileList: hw.images })
						this.formData.images = tempRes.fileList.map(item => item.tempFileURL)
					} else {
						this.formData.images = []
					}
					this.formData.file_url = hw.file_url || ''
					this.formData.file_name = hw.file_name || ''
					this.formData.allowed_ext = hw.allowed_ext || ['pdf']
					this.formData.need_submit = hw.need_submit !== false
					this.formData.rename_rule = hw.rename_rule || 'id_name'

					// 拆解截止时间
					const d = new Date(hw.deadline)
					const yyyy = d.getFullYear()
					const mm = String(d.getMonth() + 1).padStart(2, '0')
					const dd = String(d.getDate()).padStart(2, '0')
					const hh = String(d.getHours()).padStart(2, '0')
					const mi = String(d.getMinutes()).padStart(2, '0')
					this.formData.deadlineText = `${yyyy}-${mm}-${dd}`
					const timeStr = `${hh}:${mi}`
					if (timeStr === '21:00') {
						this.formData.timeType = '21:00'
					} else if (timeStr === '22:00') {
						this.formData.timeType = '22:00'
					} else {
						this.formData.timeType = 'custom'
						this.formData.customTime = timeStr
					}
					this.formData.deadline = hw.deadline

				} catch (e) {
					console.error('加载作业失败：', e)
				}
			},

			toggleExtGroup(key) {
				if (key === 'all') {
					this.formData.allowed_ext = ['all']
					return
				}
				const exts = this.extGroups[key].exts
				let list = this.formData.allowed_ext.filter(e => e !== 'all')
				const isSelected = exts.every(e => list.includes(e))
				if (isSelected) {
					list = list.filter(e => !exts.includes(e))
				} else {
					exts.forEach(e => {
						if (!list.includes(e)) list.push(e)
					})
				}
				this.formData.allowed_ext = list.length > 0 ? list : ['all']
			},

			isGroupActive(key) {
				if (key === 'all') return this.formData.allowed_ext.includes('all')
				const exts = this.extGroups[key].exts
				return exts.every(e => this.formData.allowed_ext.includes(e))
			},

			onDateChange(e) {
				this.formData.deadlineText = e.detail.value
			},

			onTimeChange(e) {
				this.formData.customTime = e.detail.value
			},

			calcDeadline() {
				let timeStr = this.formData.timeType === 'custom'
					? this.formData.customTime
					: this.formData.timeType
				const fullStr = `${this.formData.deadlineText} ${timeStr}:00`
				return new Date(fullStr).getTime()
			},
			chooseImage() {
				uni.chooseImage({
					count: 5 - this.formData.images.length,
					success: async (res) => {
						for (const path of res.tempFilePaths) {
							const uploadRes = await uniCloud.uploadFile({
								filePath: path,
								cloudPath: `homework_images/${Date.now()}_${Math.random()}.jpg`
							})
							this.formData.images.push(uploadRes.fileID)
						}
					}
				})
			},
			removeImg(i) { this.formData.images.splice(i, 1) },
			previewImg(i) { uni.previewImage({ urls: this.formData.images, current: i }) },

			chooseFile() {
				// #ifdef H5
				uni.chooseFile({
					count: 1,
					success: async (res) => {
						const file = res.tempFiles[0]
						const uploadRes = await uniCloud.uploadFile({
							filePath: file.path,
							cloudPath: `homework_files/${Date.now()}_${file.name}`
						})
						this.formData.file_url = uploadRes.fileID
						this.formData.file_name = file.name
					}
				})
				// #endif
				// #ifndef H5
				uni.showToast({ title: '请在电脑端上传文件', icon: 'none' })
				// #endif
			},
			removeFile() {
				this.formData.file_url = ''
				this.formData.file_name = ''
			},

			async handleSubmit() {
				if (!this.formData.subject || !this.formData.desc) {
					uni.showToast({ title: '科目和内容不能为空', icon: 'none' })
					return
				}
				if (!this.formData.deadlineText) {
					uni.showToast({ title: '请选择截止日期', icon: 'none' })
					return
				}
				if (this.formData.allowed_ext.length === 0) {
					uni.showToast({ title: '至少选择一种格式', icon: 'none' })
					return
				}

				const deadline = this.calcDeadline()
				const userInfo = uni.getStorageSync('userInfo')

				uni.showLoading({ title: '保存中...' })
				try {
					const res = await uniCloud.callFunction({
						name: 'updateHomework',
						data: {
							homework_id: this.homework_id,
							user_id: userInfo.userId,
							group_id: this.group_id,
							subject: this.formData.subject,
							desc: this.formData.desc,
							allowed_ext: this.formData.allowed_ext,
							deadline: deadline,
							rename_rule: this.formData.rename_rule,
							need_submit: this.formData.need_submit,
							images: this.formData.images,
							file_url: this.formData.file_url,
							file_name: this.formData.file_name
						}
					})
					uni.hideLoading()
					if (res.result.code === 200) {
						uni.showToast({ title: '保存成功！' })
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
	.input, .picker {
		height: 45px;
		background-color: #f5f7fa;
		border-radius: 8px;
		padding: 0 15px;
		font-size: 15px;
		line-height: 45px;
		color: #333;
	}
	.textarea {
		width: 100%;
		height: 100px;
		background-color: #f5f7fa;
		border-radius: 8px;
		padding: 12px 15px;
		font-size: 15px;
		box-sizing: border-box;
	}
	.ext-list { display: flex; flex-wrap: wrap; }
	.ext-item {
		padding: 6px 14px;
		background-color: #f5f7fa;
		border-radius: 15px;
		font-size: 13px;
		color: #666;
		margin: 0 10px 10px 0;
		border: 2px solid transparent;
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
	.ext-item.active {
		background-color: #e6f0ff;
		color: #007aff;
		border-color: #007aff;
		font-weight: bold;
	}
	.radio-group { display: flex; flex-wrap: wrap; }
	.radio-item {
		padding: 10px 16px;
		background-color: #f5f7fa;
		border-radius: 8px;
		font-size: 14px;
		color: #666;
		margin: 0 10px 10px 0;
		border: 2px solid transparent;
	}
	.radio-item.active {
		background-color: #e6f0ff;
		color: #007aff;
		border-color: #007aff;
		font-weight: bold;
	}
	.btn-primary {
		background-color: #007aff;
		color: #fff;
		border-radius: 25px;
		font-size: 16px;
		margin-top: 10px;
	}
</style>
