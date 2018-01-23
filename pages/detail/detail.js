// detail.js
var WxParse = require('../../wxParse/wxParse.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    imageList: [],
    tid: 0,
    page_index: 0,
    page_size: 5,
    new_reader: 0,
    loading_hidden: true,
    loading_msg: '加载中...',
    login_flag: false,
  },

  previewImage: function (e) {
    var current = e.target.dataset.src
    var urls = e.target.dataset.image_list;
    wx.previewImage({
      current: current,
      urls: urls,
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var that = this;
    wx.getStorage({
      key: 'login',
      success: function (res) {
        console.log(res.data)
        if (res.data) {
          that.setData({
            login_flag: true
          })
        }
      }
    })

    console.log(options);
    var tid = options.tid;
    this.setData({
      tid: tid,
      new_reader: 1,
    })

    var token = wx.getStorageSync("token");
    if (token == null || token == undefined || token == '') {
      wx.login({
        success: function (res) {
          if (res.code) {
            console.log(res);

            that.setData({
              loading_hidden: false,
              loading_msg: '加载中...'
            })

            wx.request({
              url: getApp().globalData.svr_url+'get_token.php',
              method: 'POST',
              header: { "content-type": "application/x-www-form-urlencoded" },
              data: {
                token: token,
                code: res.code,
              },
              success: function(resp) {
                console.log(resp);
                var resp_dict = resp.data;
                if (resp_dict.err_code == 0) {
                  wx.setStorage({
                    key: 'token',
                    data: resp.data.data.token,
                    success: function(){
                      that.reloadIndex();
                    }
                  });
                } else {
                  getApp().showSvrErrModal(resp);
                }

                that.setData({
                  loading_hidden: true,
                  loading_msg: '加载中...'
                })
              }
            })
          } else {
            console.log('获取用户登录态失败！' + res.errMsg)
          }
        }
      });
    } else {
      this.reloadIndex();
    }
  },

  reloadIndex: function () {
    var that = this;
    wx.request({
      url: getApp().globalData.svr_url + "get_post_detail.php",
      method: "post",
      header: { "content-type": "application/x-www-form-urlencoded" },
      data: {
        token: wx.getStorageSync("token"),
        tid: that.data.tid,
        new_reader: that.data.new_reader,
        page_size: 5,
        page_index: 0
      },
      success: function (resp) {
        console.log(resp);
        var resp_dict = resp.data;
        if (resp_dict.err_code == 0) {
          var imageList = [];
          that.setData({
            articleList: resp_dict.data.post_list,
            thread_data: resp_dict.data.thread_data,
            new_reader: 0,
          })  
          // 富文本
          console.log(resp_dict.data.post_list)
          // todo 将回复的楼层也进行 parse
          /*
          var post_list_length = resp_dict.data.post_list.length
          for (var i = 0; i < post_list_length; i++) {
            WxParse.wxParse('articleList_message_' + i, 'html', resp_dict.data.post_list[i].message, that, 5);
          }
          */
          var post_list_length = resp_dict.data.post_list.length
          for (let i = 0; i < post_list_length; i++) {
            WxParse.wxParse('articleList_message_' + i, 'html', resp_dict.data.post_list[i].message, that, 5);
            // if (i === post_list_length - 1) {
            //   WxParse.wxParseTemArray('articleList.message', 'reply', post_list_length, that)
            // }
          }

          WxParse.wxParse('thread_data.message', 'html', resp_dict.data.thread_data.message, that, 5);
        } else {
          getApp().showSvrErrModal(resp);
        }
      }
    })
  },

  input_message: function(e) {
    this.setData({
      message: e.detail.value
    });
  },

  submit_message: function(e) {
    var that = this;
    
    var message = that.data.message; 
    if (message == null || message == undefined || message == ''){
      getApp().showErrModal('评论内容不能为空');
      return;
    }

    wx.request({
      url: getApp().globalData.svr_url + 'add_post.php',
      header: { "content-type": "application/x-www-form-urlencoded" },
      method: 'POST',
      data: {
        token: wx.getStorageSync("token"),
        tid: that.data.tid,
        message: that.data.message,
      },
      success: function(resp) {
        console.log(resp);
        var resp_dict = resp.data;
        if (resp_dict.err_code == 10001) {
          wx.showModal({
            content: "请先登录",
            success: function(res) {
              if (res.confirm) {
                wx.switchTab({
                  url:"../user/user"
                });  
              } else if (res.cancel) {
                console.log('用户点击取消')
              }
            }
          });
        } else if (resp_dict.err_code == 0) {
          that.setData({
            message: ''
          });
          that.reloadIndex();
        } else {
          getApp().showSvrErrModal(resp);
        }
      }
    })
  },

  onReachBottom: function() {
    var that = this;
    var page_size = that.data.page_size;
    var page_index = that.data.page_index+1;
    wx.request({
      url: getApp().globalData.svr_url + "get_post_detail.php",
      method: "post",
      header: { "content-type": "application/x-www-form-urlencoded" },
      data: {
        token: wx.getStorageSync("token"),
        page_size: page_size,
        page_index: page_index,
        tid: that.data.tid,
      },
      success: function (resp) {
        console.log(resp);
        var resp_dict = resp.data;
        if (resp_dict.err_code == 0) {
          var tmpArticleList = that.data.articleList;
          var respArticleList = resp_dict.data.post_list;
          var has_append = 0;
          for (var i = 0; i < respArticleList.length; ++i) {
            var has_in = 0;
            for (var j = 0; j < tmpArticleList.length; ++j) {
              if (respArticleList[i].pid == tmpArticleList[j].pid) {
                has_in = 1;
              } 
            }
            if (has_in == 0) {
              tmpArticleList.push(respArticleList[i]);
              has_append = 1;
            }
          }

          if (has_append == 1)
          {
            that.setData({
              articleList: tmpArticleList,
              page_index: page_index  
            })
          }
        } else {
          getApp().showSvrErrModal(resp);
        }
      }
    })
  },

  onShareAppMessage: function (res) {
    return {
      title: "",
      path: '/pages/detail/detail?tid='+this.data.tid,
      success: function(res) {
        console.log(res);
      },
    }
  },
})