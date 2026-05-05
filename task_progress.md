# SeekName 后台管理系统 - 开发任务清单

## 阶段1：Prisma Schema 更新（新增模型）
- [ ] 添加 AdminUser 管理用户表（扩展 User 模型加 role）
- [ ] 添加 NavigationItem 导航菜单表
- [ ] 添加 AutoBlogConfig 自动发文配置表
- [ ] 添加 AutoBlogLog 自动发文日志表
- [ ] 更新 BlogPost 添加 category、isPinned、coverImage 字段
- [ ] 更新 BlogComment 添加 status 字段
- [ ] 添加 NamingRecordType 起名记录分类

## 阶段2：Admin API 路由
- [ ] Admin 登录/认证 API
- [ ] Dashboard 统计数据 API
- [ ] 用户管理 CRUD API
- [ ] 起名记录管理 API
- [ ] 博客管理 CRUD API
- [ ] 评论管理 API
- [ ] 导航管理 CRUD API
- [ ] 自动发文配置/日志 API

## 阶段3：Admin 前端页面
- [ ] Admin 布局（侧边栏 + 顶栏）
- [ ] Admin 登录页面
- [ ] Dashboard 控制台页面
- [ ] 用户管理页面
- [ ] 起名记录管理页面
- [ ] 博客管理页面（含富文本编辑器）
- [ ] 评论管理页面
- [ ] 导航管理页面（拖拽排序）
- [ ] 自动发文配置页面
- [ ] 权限管理页面