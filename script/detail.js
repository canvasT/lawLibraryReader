window.MSA.Detail = MSA.Class({
    init: function(data){
        this.page = data.page;
        this.article = data.article;
        this.$p = $(this.page);
        this.$appContent = this.$p.find('.app-content');
        this.$topBar = this.$p.find('.app-topbar');
        this.$topBar.addClass('detail-topbar');
        this.$title = this.$p.find('.app-title');
        this.initData();
        this.initDom();
        this.initEvent();
    },

    initData: function(){
        var that = this;
    },

    initDom: function(){
        this.$title.text(this.article.title);
        this.loadDetail();
    },

    initEvent: function(){

    },

    loadDetail: function(){
    	var that = this;
        sql.getDetailById(this.article.id).done(function(_res){
            var pattern = /<body[^>]*>((.|[\n\r])*)<\/body>/im;
            var array_matches = pattern.exec(_res['content'] || _res['markdown_html']);
            var html = '<div class="doc-date">颁布日期：' + (that.article['publish_date']|| '-') + '</div>';
            that.$appContent.html(html + array_matches[1]);
        });
    }
});
App.controller('detail', function (page, args) {
    // put stuff here
    var detail = new MSA.Detail({
        page: page,
        article: args.article
    });
});