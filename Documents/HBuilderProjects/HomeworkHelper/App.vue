<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/* 全局页面容器约束：所有页面内容占屏幕 1/3 并居中 */
	page {
		background-color: #f5f7fa;
	}

	/* 通用容器：所有页面的根 view 加这个 class 即可 */
	.container {
		width: 33%;
		min-width: 360px;
		margin: 0 auto;
		padding: 20px;
		min-height: 100vh;
		background-color: #f5f7fa;
		box-sizing: border-box;
	}
</style>
