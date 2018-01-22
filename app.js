//app.js
App({
  onLaunch: function() {
    var that = this;
    wx.getUserInfo({
      success: function (res) {
        //console.log(res.userInfo) // 打印微信用户信息
        that.globalData.userInfo = res.userInfo;
      }
    });
    that.get_token(); // 获取token
  },


  get_token: function() {
    var that = this;
    wx.login({
      success: function (res) {
        if (res.code) {
          console.log(res);
          wx.request({
            url: getApp().globalData.svr_url+'get_token.php',
            method: 'POST',
            header: { "content-type": "application/x-www-form-urlencoded" },
            data: {
              token: wx.getStorageSync("token"),
              code: res.code,
            },
            success: function(resp) {
              console.log(resp);
              var resp_dict = resp.data;
              if (resp_dict.err_code == 0) {
                wx.setStorage({
                  key: 'token',
                  data: resp_dict.data.token,
                  success: function() {
                    if (resp_dict.data.has_login != 1) {
                        that.wxLogin();
                    }
                  }
                })
              } else {
                that.showSvrErrModal(resp)
              }
            }
          })
        } else {
          console.log('获取用户登录态失败！' + res.errMsg)
        }
      }
    });
  },


  wxLogin: function() {
    var that = this;
    console.log('wxLogin');
    wx.getUserInfo({
      success: function (res) {
        console.log(res.userInfo);
        var username = res.userInfo.nickName;
        var avatar_url = res.userInfo.avatarUrl;
        if (username && avatar_url){
          wx.request({
            url: getApp().globalData.svr_url+'wx_login.php',
            method: 'POST',
            header: { "content-type": "application/x-www-form-urlencoded" },
            data: {
              token: wx.getStorageSync("token"),
              username: username,
              avatar_url: avatar_url
            },
            success: function(resp) {
              console.log(resp);
              var resp_dict = resp.data;
              if (resp_dict.err_code == 0) {
                wx.setStorage({
                  key: 'token',
                  data: resp_dict.data.token,
                })
              } else {
                that.showSvrErrModal(resp);
              }
            }
          })
        }
      }
    });
  },

  showSvrErrModal: function(resp) {
    if (resp.data.err_code != 0 && resp.data.err_msg) {
      this.showErrModal(resp.data.err_msg);
    } else {
      console.log(resp);
      wx.request({
        url: getApp().globalData.svr_url+'report_error.php',
        method: 'POST',
        header: { "content-type": "application/x-www-form-urlencoded" },
        data: {
          token: wx.getStorageSync("token"),
          error_log: resp.data,
          svr_url: getApp().globalData.svr_url,
        },
        success: function(resp) {
          console.log(resp);
        }
      })
    }
  },

  showErrModal: function(err_msg) {
    wx.showModal({
      content: err_msg,
      showCancel: false
    });
  },

  globalData: {
    svr_url: 'http://localhost/wmapi/',
    userInfo: null,
  }
})
