<div align="center">
  <img width="60%" alt="智小二宣传图" src="https://github.com/user-attachments/assets/22a22577-af38-442c-af3d-3cec5566dad3" />
</div>

# 智小二——收集·打包·重命名一体化作业收集方案

**收集，打包，重命名。让收作业变得不再繁琐。**

智小二是一款专为学委与教师设计的智能作业文件收取与管理系统。
传统的作业收集方式往往伴随着群消息催促、文件命名混乱、人工核对名单以及繁琐的二次整理，而智小二致力于将这一流程标准化与自动化。
管理员在系统中设定作业要求、截止时间、文件格式及命名规则后，学生提交的文件将**自动完成合规校验**与**标准化重命名**。
学委在管理端可**实时查看提交统计**，并一键将全班作业**打包为压缩文件**，从而显著降低沟通成本，提升作业收取效率。

## 下载与开始使用

- **H5 网页端**：[点击此处访问](https://env-00jy6t6g3q4l-static.normal.cloudstatic.cn)，无需安装，即点即用。
- **Android 手机端**：在 GitHub Releases 页面下载最新版本的 `.apk` 文件（目前仅支持安卓端）。
- **管理员/学委**：请在电脑端登录 H5 网页，体验完整的一键打包功能。

## 核心功能

1. **精细的作业配置**
   在发布作业时，除了文字说明，支持附加参考图片和文件；可强制设定“允许的格式”（如仅限 PDF）与“重命名规则”（如学号+姓名）。
2. **自动化的提交拦截**
   学生提交的文件若不符合要求（超出截止时间、文件类型错误），系统会直接打回；若按时提交，系统会按照学委或老师的设定自动重命名，彻底告别人工核对。
3. **数据隔离的群组管理**
   输入群组号与密码即可加入群组，各群组的作业、通知与提交记录完全独立，互不干扰；**创建群组时需要的激活码请联系开发者获取**。
4. **一键生成提交统计**
   已交名单、未交名单实时更新，学委在后台一目了然。
5. **一键打包下载**
   学委在电脑端点击打包，系统会将全班作业压缩为 zip 文件，直接转发给老师。

## 应用截图
<div align="center">
  <img width="60%" alt="主页面" src="https://github.com/user-attachments/assets/fdcc215d-0880-4bcd-94f7-3e4b38b83573" />
  <br/><em>主页面与待办展示</em>
</div>
<br/>

<div align="center">
  <img width="60%" alt="群组内部页面" src="https://github.com/user-attachments/assets/e5d01b34-8cdb-44b1-95b0-73c023b022c8" />
  <br/><em>群组内部页面</em>
</div>
<br/>

<div align="center">
  <img width="60%" alt="作业布置页面" src="https://github.com/user-attachments/assets/6674b5f1-8497-40ad-821b-fe89afcefbb9" />
  <br/><em>作业布置与规则配置</em>
</div>
<br/>

<div align="center">
  <img width="60%" alt="提交统计页面" src="https://github.com/user-attachments/assets/05765720-b358-41db-ab52-1b7d0f95bbc3" />
  <br/><em>提交统计与一键打包</em>
</div>

## 数据与隐私

系统的核心数据托管在 uniCloud 云端。每个班级群组的数据相互隔离，密码采用 MD5 加密存储。文件上传和下载仅在特定群组内进行，学生无法查看其他班级的作业与名单。

## 技术栈与架构

- **前端**：UniApp + Vue 3 (支持 App / H5 多端发布)
- **后端**：uniCloud (Serverless 云函数)
- **数据库**：uniCloud DB (文档型数据库)

## 文档、反馈与参与开发

- 如果你是首次使用，请点击 App 内登录界面左下方的“功能介绍”查看图文教程。
- 遇到 Bug 或有功能建议，欢迎在 GitHub 提 Issue。
- 联系作者：QQ 410936697
