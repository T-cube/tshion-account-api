import C from 'lib/constants';

export default[
  {
    name: '免费版',
    type: C.TEAMPLAN.FREE,
    description: '免费团队，可使用T立方的基本功能',
    default_member: 20,
    project_actived: 10,
    project_all: 20,
    store: 10 * 1024 * 1024 * 1024, // 10G
    project_store: 100 * 1024 * 1024, // 100M
    inc_member_store: 0,
    max_file_size: 5 * 1024 * 1024, // 5M
    max_member: 20,
  },
  {
    name: '专业版',
    type: C.TEAMPLAN.PRO,
    description: '专业版团队',
    default_member: 10,
    project_actived: 50,
    project_all: 100,
    store: 20 * 1024 * 1024 * 1024, // 20G
    project_store: 500 * 1024 * 1024, // 500M
    inc_member_store: 500 * 1024 * 1024, // 500M
    max_file_size: 10 * 1024 * 1024, // 10M
    max_member: 1000,
    ext_info: '专业版',
  },
  {
    name: '企业版',
    type: C.TEAMPLAN.ENT,
    description: '企业版团队',
    default_member: 10,
    project_actived: 100,
    project_all: 200,
    store: 100 * 1024 * 1024 * 1024, // 100G
    project_store: 1 * 1024 * 1024 * 1024, // 1G
    inc_member_store: 1 * 1024 * 1024 * 1024, // 1G
    max_file_size: 20 * 1024 * 1024, // 20M
    max_member: 1000,
    ext_info: '企业版',
  },
];
