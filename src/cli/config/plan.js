import C from 'lib/constants';

export default[
  {
    name: '免费版',
    type: C.TEAMPLAN.FREE,
    description: '免费团队，可使用T立方的基本功能',
    default_member: 1000,
    project_actived: 30,
    project_all: 50,
    store: 5 * 1024 * 1024 * 1024, // 5G
    project_store: 100 * 1024 * 1024, // 100M
    inc_member_store: 0,
    max_file_size: 5 * 1024 * 1024, // 5M
    max_member: 1000,
    max_approval_templete: 3,
  },
  {
    name: '专业版',
    type: C.TEAMPLAN.PRO,
    description: '专业版团队',
    default_member: 10,
    project_actived: 100,
    project_all: 1000,
    store: 25 * 1024 * 1024 * 1024, // 25G
    project_store: 500 * 1024 * 1024, // 500M
    inc_member_store: 2.5 * 1024 * 1024 * 1024, // 2.5G
    max_file_size: 10 * 1024 * 1024, // 10M
    max_member: 1000,
    ext_info: '专业版',
    max_approval_templete: 10,
  },
  {
    name: '企业版',
    type: C.TEAMPLAN.ENT,
    description: '企业版团队',
    default_member: 10,
    project_actived: 200,
    project_all: 1000,
    store: 50 * 1024 * 1024 * 1024, // 50G
    project_store: 1 * 1024 * 1024 * 1024, // 1G
    inc_member_store: 5 * 1024 * 1024 * 1024, // 5G
    max_file_size: 20 * 1024 * 1024, // 20M
    max_member: 1000,
    ext_info: '企业版',
    max_approval_templete: 1000,
  },
];
