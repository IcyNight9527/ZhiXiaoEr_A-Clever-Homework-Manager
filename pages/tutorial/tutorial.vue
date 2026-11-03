<template>
	<view class="tutorial-wrapper">
		<scroll-view scroll-y class="tutorial-container">
			<image src="/static/poster1.png" mode="widthFix" class="tutorial-img" />
			<image src="/static/poster2.png" mode="widthFix" class="tutorial-img" />
		</scroll-view>

		<!-- 右下角悬浮分享按钮 -->
		<view class="share-btn" @click="saveQRCode">
			<text>分享</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {}
		},
		methods: {
			saveQRCode() {
			    // #ifdef APP-PLUS
			    uni.saveImageToPhotosAlbum({
			        filePath: '/static/web_qrcode.png',
			        success: () => {
			            uni.showModal({
			                title: '保存成功',
			                content: '二维码已保存到相册，快去分享给同学吧！',
			                showCancel: false
			            })
			        },
			        fail: () => {
			            uni.showToast({ title: '保存失败，请重试', icon: 'none' })
			        }
			    })
			    // #endif

			    // #ifdef H5
			    uni.previewImage({
			        urls: ['/static/web_qrcode.png'],
			        success: () => {
			            uni.showToast({
			                title: '请长按图片保存，或右键另存为',
			                icon: 'none',
			                duration: 3000
			            })
			        }
			    })
			    // #endif
			},
		}
	}
</script>

<style>
	.tutorial-wrapper {
		position: relative;
		height: 100vh;
	}
	.tutorial-container {
		height: 100vh;
		background-color: #f5f7fa;
		max-width: 500px;
		margin: 0 auto;
	}
	.tutorial-img {
		width: 100%;
		display: block;
	}

	/* 右下角悬浮分享按钮 */
	.share-btn {
		position: fixed;
		right: 20px;
		bottom: 40px;
		width: 56px;
		height: 56px;
		line-height: 56px;
		text-align: center;
		background-color: #007aff;
		color: #fff;
		border-radius: 50%;
		font-size: 14px;
		font-weight: bold;
		box-shadow: 0 4px 12px rgba(0,122,255,0.4);
		z-index: 999;
	}
</style>
