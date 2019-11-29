'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx } = this;

    const result = await ctx.curl('http://localhost/Admin/index.php/Public/signin', {
      // 自动解析 JSON response
      dataType: 'json',
      method:'POST',
      headers:{
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
      },
      data:{
        account:'admin',
        password:'nd2019'
      },
      // 3 秒超时
      timeout: 3000,
    });
    ctx.body = {
      status: result.status,
      headers: result.headers,
      package: result.data,
    };
  }
  async api(){
    const { ctx } = this;
    const token = 'YTozOntzOjM6InB3ZCI7czozMjoiZjU4Yzg2NGFjMDFhMDQwYzBmYjc1MWViZmIzODFjMGMiO3M6NDoidXNlciI7czo1OiJhZG1pbiI7czo1OiJvcmRlciI7czoxOiIxIjt9'
    const params = ctx.params
    const host = 'http://localhost/Admin/index.php'
    const result = await ctx.curl(`${host}/${params.action}/${params.method}`, {
      dataType: 'json',
      method:'POST',
      headers:{
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        'token':token,
      },
      data:{...this.ctx.request.body},
      timeout: 100000,
    });
    ctx.body = result.data
  }
}

module.exports = HomeController;
