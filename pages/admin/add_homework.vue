<template>
	<view class="container">
		<view class="form-box">
			<view class="form-item">
				<text class="label">科目</text>
				<input class="input" v-model="formData.subject" placeholder="如：数据库原理" />
			</view>

			<view class="form-item">
				<text class="label">作业内容</text>
				<textarea class="textarea" v-model="formData.desc" placeholder="请填写作业内容" />
			</view>

			<view class="form-item">
				<text class="label">作业图片（最多5张）</text>
				<view class="upload-list">
					<view
						class="upload-item"
						v-for="(img, i) in formData.imagePreviewUrls"
						:key="i"
					>
						<image
							:src="img"
							mode="aspectFill"
							class="upload-img"
							@click="previewImg(i)"
						/>
						<text class="upload-del" @click="removeImg(i)">×</text>
					</view>

					<view
						class="upload-add"
						v-if="formData.imagePreviewUrls.length < 5"
						@click="chooseImage"
					>＋</view>
				</view>
			</view>

			<view class="form-item">
				<text class="label">作业文件（1个，仅网页端，若无法显示请在作业发布后重新上传）</text>
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
				<text class="label">截止日期</text>
				<picker mode="date" @change="onDateChange">
					<view class="picker">
						{{ formData.deadlineText || '请选择截止日期' }}
					</view>
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

			<button class="btn-primary" @click="handleSubmit">发布作业</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				group_id: '',
				pendingImages: [],
				pendingFile: null,
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
					imagePreviewUrls: [],
					file_url: '',
					file_name: ''
				}
			}
		},
		onLoad(options) {
			this.group_id = options.group_id || ''
		},
		methods: {
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

			chooseImage() {
				const remainingCount = 5 - this.formData.imagePreviewUrls.length

				if (remainingCount <= 0) {
					uni.showToast({
						title: '最多上传5张图片',
						icon: 'none'
					})
					return
				}

				uni.chooseImage({
					count: remainingCount,
					success: (res) => {
						for (const path of res.tempFilePaths) {
							this.pendingImages.push({
								path
							})
							this.formData.imagePreviewUrls.push(path)
						}
					},
					fail: () => {
						uni.showToast({
							title: '未选择图片',
							icon: 'none'
						})
					}
				})
			},

			removeImg(index) {
				if (index < this.formData.images.length) {
					this.formData.images.splice(index, 1)
					this.formData.imagePreviewUrls.splice(index, 1)
					return
				}

				const pendingIndex = index - this.formData.images.length

				if (pendingIndex >= 0 && pendingIndex < this.pendingImages.length) {
					this.pendingImages.splice(pendingIndex, 1)
				}

				this.formData.imagePreviewUrls.splice(index, 1)
			},

			previewImg(index) {
				const urls = this.formData.imagePreviewUrls.filter(Boolean)
				const currentUrl = this.formData.imagePreviewUrls[index]

				if (!currentUrl) return

				uni.previewImage({
					urls,
					current: urls.indexOf(currentUrl)
				})
			},

			chooseFile() {
				// #ifdef H5
				uni.chooseFile({
					count: 1,
					success: (res) => {
						const file = res.tempFiles[0]

						if (!file) return

						this.pendingFile = {
							path: file.path,
							name: file.name
						}

						this.formData.file_name = file.name
					}
				})
				// #endif

				// #ifndef H5
				uni.showToast({
					title: '请在电脑端上传文件',
					icon: 'none'
				})
				// #endif
			},
			removeFile() {
				this.pendingFile = null
				this.formData.file_url = ''
				this.formData.file_name = ''
			},
			async uploadPendingAssets() {
				// 上传待处理图片，每成功一张就移出待上传数组
				while (this.pendingImages.length > 0) {
					const image = this.pendingImages[0]

					uni.showLoading({
						title: '上传图片中...'
					})

					const uploadRes = await uniCloud.uploadFile({
						filePath: image.path,
						cloudPath: `homework_images/${Date.now()}_${Math.random()}.jpg`
					})

					if (!uploadRes.fileID) {
						throw new Error('图片上传失败')
					}

					this.formData.images.push(uploadRes.fileID)
					this.pendingImages.shift()
				}

				// 上传待处理附件
				if (this.pendingFile) {
					uni.showLoading({
						title: '上传附件中...'
					})

					const uploadRes = await uniCloud.uploadFile({
						filePath: this.pendingFile.path,
						cloudPath: `homework_files/${Date.now()}_${this.pendingFile.name}`
					})

					if (!uploadRes.fileID) {
						throw new Error('附件上传失败')
					}

					this.formData.file_url = uploadRes.fileID
					this.formData.file_name = this.pendingFile.name
					this.pendingFile = null
				}
			},
			calcDeadline() {
				const timeStr = this.formData.timeType === 'custom'
					? this.formData.customTime
					: this.formData.timeType

				const dateParts = (this.formData.deadlineText || '')
					.split('-')
					.map(Number)

				const timeParts = (timeStr || '')
					.split(':')
					.map(Number)

				if (
					dateParts.length !== 3 ||
					timeParts.length !== 2
				) {
					return NaN
				}

				const [year, month, day] = dateParts
				const [hour, minute] = timeParts

				const isAllInteger = [
					year,
					month,
					day,
					hour,
					minute
				].every(Number.isInteger)

				if (!isAllInteger) {
					return NaN
				}

				const date = new Date(
					year,
					month - 1,
					day,
					hour,
					minute,
					0,
					0
				)

				// 防止 2026-02-30 这类非法日期被浏览器自动纠正
				const isValidDate =
					date.getFullYear() === year &&
					date.getMonth() === month - 1 &&
					date.getDate() === day &&
					date.getHours() === hour &&
					date.getMinutes() === minute

				if (!isValidDate) {
					return NaN
				}

				return date.getTime()
			},

			async handleSubmit() {
				if (!this.formData.subject) {
					uni.showToast({
						title: '请输入科目',
						icon: 'none'
					})
					return
				}

				if (!this.formData.desc) {
					uni.showToast({
						title: '请输入作业内容',
						icon: 'none'
					})
					return
				}

				if (!this.formData.deadlineText) {
					uni.showToast({
						title: '请选择截止日期',
						icon: 'none'
					})
					return
				}

				if (
					this.formData.timeType === 'custom' &&
					!this.formData.customTime
				) {
					uni.showToast({
						title: '请选择自定义时间',
						icon: 'none'
					})
					return
				}

				const deadline = this.calcDeadline()

				if (!Number.isFinite(deadline)) {
					uni.showToast({
						title: '截止时间无效，请重新选择',
						icon: 'none'
					})
					return
				}

				if (deadline <= Date.now()) {
					uni.showToast({
						title: '截止时间必须晚于当前时间',
						icon: 'none'
					})
					return
				}

				try {
					// 到这一步才开始真正上传新选择的图片和附件
					await this.uploadPendingAssets()

					uni.showLoading({
						title: '发布中...'
					})

					const res = await uniCloud.callFunction({
						name: 'addHomework',
						data: {
							subject: this.formData.subject,
							desc: this.formData.desc,
							allowed_ext: this.formData.allowed_ext,
							deadline: deadline,
							group_id: this.group_id,
							need_submit: this.formData.need_submit,
							rename_rule: this.formData.rename_rule,
							images: this.formData.images,
							file_url: this.formData.file_url,
							file_name: this.formData.file_name
						}
					})

					const result = res.result || {}

					if (result.code !== 200) {
						throw new Error(result.msg || '发布失败')
					}

					uni.showToast({
						title: '发布成功！'
					})

					setTimeout(() => {
						uni.navigateBack()
					}, 1000)
				} catch (error) {
					console.error('发布作业失败：', error)

					uni.showToast({
						title: error.message || '网络异常',
						icon: 'none'
					})
				} finally {
					uni.hideLoading()
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
	.textarea {
		width: 100%;
		height: 80px;
		background-color: #f5f7fa;
		border-radius: 8px;
		padding: 12px 15px;
		font-size: 15px;
		box-sizing: border-box;
	}
	.ext-group { display: flex; flex-wrap: wrap; gap: 10px; }
	.ext-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.ext-item {
		padding: 6px 14px;
		background-color: #f5f7fa;
		border-radius: 15px;
		font-size: 13px;
		color: #666;
		border: 2px solid transparent;
		white-space: nowrap;
	}
	.upload-list { display: flex; flex-wrap: wrap; gap: 10px; }
	.upload-item { position: relative; width: 80px; height: 80px; }
	.upload-img { width: 100%; height: 100%; border-radius: 8px; }
	.upload-del { position: absolute; top: -8px; right: -8px; color: #fff; background: #ff3b30; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; font-size: 12px; }
	.upload-add { width: 80px; height: 80px; border: 2px dashed #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 30px; color: #999; }
	.upload-file { display: flex; justify-content: space-between; padding: 10px; background: #f5f7fa; border-radius: 8px; }
	.upload-btn { background: #e6f0ff; color: #007aff; font-size: 14px; border-radius: 8px; }
	.ext-item.active {
		background-color: #e6f0ff;
		color: #007aff;
		border-color: #007aff;
		font-weight: bold;
	}
	.ext-item.disabled {
		opacity: 0.4;
	}
	.ext-item.active {
		background-color: #e6f0ff;
		color: #007aff;
		border-color: #007aff;
		font-weight: bold;
	}
	.picker {
		height: 45px;
		line-height: 45px;
		background-color: #f5f7fa;
		border-radius: 8px;
		padding: 0 15px;
		font-size: 15px;
		color: #333;
	}
	.btn-primary {
		background-color: #007aff;
		color: #fff;
		border-radius: 25px;
		font-size: 16px;
		margin-top: 10px;
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
	.ext-item.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.radio-item:last-child { margin-right: 0; }
	.radio-item.active {
		background-color: #e6f0ff;
		color: #007aff;
		border-color: #007aff;
		font-weight: bold;
	}
</style>
