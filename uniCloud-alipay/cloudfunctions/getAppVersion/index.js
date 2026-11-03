const db = uniCloud.database()

exports.main = async (event, context) => {
	try {
		// 1. 查配置表
		const res = await db.collection('app_config').limit(1).get()
		if (res.data.length === 0) {
			return { code: 404, msg: '未找到版本配置' }
		}

		const config = res.data[0]

		// 2. 如果填的是 cloud:// 路径，就把它换成真实的临时直链
		if (config.download_url && config.download_url.startsWith('cloud://')) {
			const tempRes = await uniCloud.getTempFileURL({
				fileList: [config.download_url]
			})
			if (tempRes.fileList && tempRes.fileList.length > 0) {
				config.download_url = tempRes.fileList[0].tempFileURL
			}
		}

		return {
			code: 200,
			msg: '获取成功',
			data: config
		}
	} catch (e) {
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
