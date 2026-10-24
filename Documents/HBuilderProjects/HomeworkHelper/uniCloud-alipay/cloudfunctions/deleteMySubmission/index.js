const db = uniCloud.database()

exports.main = async (event, context) => {
	const { submission_id, user_id } = event

	if (!submission_id || !user_id) {
		return { code: 400, msg: '参数不完整' }
	}

	try {
		// 1. 查这条提交记录
		const res = await db.collection('submissions').doc(submission_id).get()
		if (res.data.length === 0) {
			return { code: 404, msg: '提交记录不存在' }
		}

		const sub = res.data[0]

		// 2. 校验：只能删自己的
		if (sub.student_id !== user_id) {
			return { code: 403, msg: '只能删除自己的提交' }
		}

		// 3. 删除记录
		await db.collection('submissions').doc(submission_id).remove()

		return { code: 200, msg: '已删除提交' }

	} catch (e) {
		return { code: 500, msg: '服务器内部错误', error: e.message }
	}
}
