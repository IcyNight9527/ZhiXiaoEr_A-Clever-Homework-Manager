const db = uniCloud.database()

const MAX_DAILY_SUBMISSIONS = 3
const VALID_CATEGORIES = new Set([
	'账号与密码',
	'通行证相关',
	'bug上报',
	'其它'
])

function getShanghaiDayKey(timestamp = Date.now()) {
	const shanghaiTime = new Date(
		timestamp + 8 * 60 * 60 * 1000
	)

	return shanghaiTime.toISOString().slice(0, 10)
}

async function listMyFeedback(userId) {
	const dayKey = getShanghaiDayKey()

	const countRes = await db.collection('feedbacks')
		.where({
			user_id: userId,
			day_key: dayKey
		})
		.count()

	const feedbackRes = await db.collection('feedbacks')
		.where({ user_id: userId })
		.orderBy('created_at', 'desc')
		.limit(30)
		.get()

	const feedbacks = feedbackRes.data.map(item => ({
		_id: item._id,
		category: item.category,
		content: item.content,
		status: item.status,
		reply: item.reply || '',
		replied_at: item.replied_at || 0,
		created_at: item.created_at
	}))

	return {
		code: 200,
		msg: '获取成功',
		data: {
			feedbacks,
			remaining_today: Math.max(
				0,
				MAX_DAILY_SUBMISSIONS - countRes.total
			)
		}
	}
}

async function submitFeedback(event) {
	const {
		user_id,
		category,
		content,
		client_version = '',
		platform = ''
	} = event

	if (typeof user_id !== 'string' || !user_id.trim()) {
		return {
			code: 400,
			msg: '缺少用户信息'
		}
	}

	if (!VALID_CATEGORIES.has(category)) {
		return {
			code: 400,
			msg: '请选择有效的问题分类'
		}
	}

	if (typeof content !== 'string') {
		return {
			code: 400,
			msg: '反馈内容格式错误'
		}
	}

	const normalizedContent = content.trim()

	if (normalizedContent.length < 5) {
		return {
			code: 400,
			msg: '反馈内容至少5个字符'
		}
	}

	if (normalizedContent.length > 500) {
		return {
			code: 400,
			msg: '反馈内容不能超过500个字符'
		}
	}

	const userId = user_id.trim()

	const userRes = await db.collection('users')
		.where({ userId })
		.limit(1)
		.get()

	const user = userRes.data[0]

	if (!user) {
		return {
			code: 404,
			msg: '用户不存在'
		}
	}

	const now = Date.now()
	const dayKey = getShanghaiDayKey(now)

	const countRes = await db.collection('feedbacks')
		.where({
			user_id: userId,
			day_key: dayKey
		})
		.count()

	if (countRes.total >= MAX_DAILY_SUBMISSIONS) {
		return {
			code: 429,
			msg: '今天提交反馈的次数已用完，请明天再试',
			data: {
				remaining_today: 0
			}
		}
	}

	const res = await db.collection('feedbacks').add({
		user_id: userId,
		user_name: user.name || '',
		category,
		content: normalizedContent,
		status: 'pending',
		reply: '',
		replied_at: 0,
		day_key: dayKey,
		created_at: now,
		client_version: String(client_version || '').slice(0, 50),
		platform: String(platform || '').slice(0, 20)
	})

	return {
		code: 200,
		msg: '问题提交成功',
		data: {
			id: res.id,
			remaining_today: Math.max(
				0,
				MAX_DAILY_SUBMISSIONS - countRes.total - 1
			)
		}
	}
}

exports.main = async (event = {}) => {
	const action = event.action || 'list'

	try {
		if (action === 'submit') {
			return await submitFeedback(event)
		}

		if (action === 'list') {
			if (
				typeof event.user_id !== 'string' ||
				!event.user_id.trim()
			) {
				return {
					code: 400,
					msg: '缺少用户信息'
				}
			}

			return await listMyFeedback(event.user_id.trim())
		}

		return {
			code: 400,
			msg: '不支持的操作'
		}
	} catch (error) {
		console.error('用户反馈操作失败：', error)

		return {
			code: 500,
			msg: '服务器内部错误'
		}
	}
}
