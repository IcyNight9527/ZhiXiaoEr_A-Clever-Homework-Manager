const db = uniCloud.database()

exports.main = async (event, context) => {
	const { student_id } = event
	if (!student_id) {
		return { code: 400, msg: '缺少学生ID' }
	}
	try {
		const res = await db.collection('submissions')
			.where({ student_id: student_id })
			.get()
		return { code: 200, msg: '获取成功', data: res.data }
	} catch (e) {
		return { code: 500, msg: '获取失败', error: e.message }
	}
}
