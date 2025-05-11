//	滚动触发动效插件 v20190809
//	依赖 jquery、tweenmax
/*
	attr: x y scale rotation skewX skewY xPercent yPercent
				force3D transformOrigin perspective(父级) transformSpective(自身)
				autoAlpha stagger delay repeat repeatDelay yoyo
				cycle overwrite

	ease: [ease.easeIn, ease.easeOut, ease.easeInOut] [config()]
			Power0.easeNone, Power1, Power2, Power3, Power4, Bounce, Circ, Expo, Sine
			Back, Elastic
			RoughEase, SlowMo, SteppedEase

选项与配置( $.xRoll({options}, {configs}) )
	$.xRoll({
		item: {
			elm: '.s0 .xr-item',					//	运动元素
			sort: null										//	元素排序
		},
		anchor: {
			pin: 'self',									//	锚点位置
			offset: 0											//	锚点偏移
		},
		cursor: {
			point: '90%',									//	游标位置
			long: 0												//	持续触发
		},
		trans: {
			dur: 1,												//	执行动画的时间
			stag: 0.5,										//	序列运动的间隔时间
			space: 0,											//	分步运动的间隔时间
			attr: {												//	动画的属性
				y: '30%'
			}
		},
		mobile: false										//	是否支持移动端动画
	},{
		debug: false, 									//	调试模式
		className: {
			c1: 'xr_cur',									//	锚点到达游标位置时 锚点的class
			c2: 'xr_act'									//	锚点到达游标位置时 元素的class
		},
	});
*/
	

;(function($){
	if ($.xRoll) {
		debug( true, '插件重复引用或有同名插件引用');
		return;
	}
	
	var public = {
		$win: $(window),
		$doc: $(document),
		$html: $('html'),
		onDebug: false,
		count: 0,
		tl: new TimelineMax({id: 'xroll'})
	};

	//	页面加载前隐藏
	public.$html.addClass('xr_hidden');
	
	//	页面加载后显示
	public.$win.on('load', function(){
		public.$html.removeClass('xr_hidden');
	});
	
	$.xRoll = function(opts, cfg){
		
		public.$body = $('body');
		
		if(!public.$body.data('xroll')){
			public.$body.data('xroll', true);
			public.data = get_winSize(public);
		}
		
		
		if(is_object(opts)){										//	$.xRoll({})
			if(is_boolean(cfg)){									//	$.xRoll({}, true/false)
				cfg = {debug: cfg};
			}else if(is_string(cfg)){							//	$.xRoll({}, 'class')
				cfg = {className: {c1: cfg}};
			}
		
			if(is_string(opts.item)){							//	$.xRoll({item: '.class/#id/element'})
				opts.item = $(opts.item);
			}
			
			if(is_jquery(opts.item) || (is_object(opts.item) && is_undefined(opts.item.elm))){							//	$.xRoll({item: $(selecter)/{}})
				opts.item = {elm: opts.item};
			}
			
			if(!is_undefined(opts.anchor) && !is_object(opts.anchor)){					//	$.xRoll({anchor: !{}})
				opts.anchor = {pin: opts.anchor};
			}

			if(!is_undefined(opts.item) && !is_undefined(opts.item.elm)){
				if(is_string(opts.item.elm)){					//	$.xRoll({item: {elm: '.class/#id/element'}})
					opts.item.elm = $(opts.item.elm);
				}

				if(is_jquery(opts.item.elm)){					//	$.xRoll({item: {elm: $(selecter)}})
					sortSelecter(opts.item.elm, opts.item.sort);
				}

				if(!is_undefined(opts.anchor) && opts.anchor.pin === 'each' && is_jquery(opts.item.elm) && opts.item.elm.length > 1){			//	$.xRoll({anchor: {pin: 'each'}})
					return opts.item.elm.each(function(){
						$.xRoll($.extend(true, {}, opts, {item: {elm: $(this), sort: null}, anchor: {pin: 'self'}}), cfg);
					});
				}
			}else if(is_undefined(opts.anchor) || is_undefined(opts.anchor.pin)){
				debug( true, '配置项[anchor.pin]未指定');
			}
			
			if(is_string(opts.cursor)){							//	$.xRoll({cursor: ''})
				if(is_percentage(opts.cursor)){				//	$.xRoll({cursor: 'n%'})
					opts.cursor = {point: opts.cursor};
				}else{																//	$.xRoll({cursor: '.class/#id/element'})
					opts.cursor = {long: $(opts.cursor)};
				}
			}else if(is_number(opts.cursor)){				//	$.xRoll({cursor: n})
				opts.cursor = {point: opts.cursor};
			}else if(is_jquery(opts.cursor)){				//	$.xRoll({cursor: $(selecter)})
				opts.cursor = {long: opts.cursor};
			}
			
			if(is_number(opts.trans)){							//	$.xRoll({trans: n})
				opts.trans = {dur: opts.trans};
			}

			if(is_object(opts.trans) && is_undefined(opts.trans.attr) && is_undefined(opts.trans.dur) && is_undefined(opts.trans.stag) && is_undefined(opts.trans.space)){
				opts.trans = {attr: opts.trans};
			}
		}else{																	//	$.xRoll(selecter)
			if(is_string(opts)){									//	$.xRoll('.class/#id/element')
				opts = $(opts);
			}
			
			if(is_jquery(opts)){									//	$.xRoll($(selecter))
				opts = {item: {elm: opts}};
				
				if(is_undefined(cfg) || is_string(cfg)){									//	$.xRoll($(selecter), 'undefined/left/right/top/bottom')
					opts.trans = cfg;
				}else{
					debug( true, '快捷配置下第二个参数应为预设动效的关键字');
				}
			}else{
				debug( true, '快捷配置下第一个参数应为运动元素');
			}
		}
		
		var _cfg = $.extend(true, {}, $.xRoll.configs, cfg);

		var _opts = format_options(opts, _cfg);
		
		var tl = new TimelineMax({paused: true, id: _opts.pos + '-' + new Date().getTime()}),
				sdata = {in: false, out: false, over: false, once: false};
		
//		public.tl.add(tl);
		
		if(device().isMobile && is_false(_opts.mobile)){
//			public.tl.remove(tl);
			
			tl.kill();
			tl = null;
		}
		
		

		_opts.trans = get_transData(opts.trans, {tl: tl, item: _opts.item.elm, pos: _opts.pos});
		
		if(is_true(_cfg.debug)){
			if(is_false(public.onDebug)){
				public.onDebug = true;
				public.$body.append('<div class="xr_debug"><div class="xr_scroll" style="position: fixed; top: 0; right: 5px; padding: 5px; background-color: rgba(25,87,0,0.5); color: #fff; z-index: 999999;">'+ public.data.scroll +'</div><div class="xr_pin"></div></div>');
			}
			
			debugMode(_opts);
		}
		
		public.$win.on(x_e('load', _cfg), function(){
			public.data.scroll = public.$win.scrollTop();
			state(tl, public.data.scroll, _opts, _cfg, sdata);

		//	load	//
		});

		public.$win.on(x_e('scroll', _cfg), function(){
			public.data.scroll = public.$win.scrollTop();
			state(tl, public.data.scroll, _opts, _cfg, sdata);
			
			if(public.onDebug){
				$('.xr_debug .xr_scroll').text(public.data.scroll);
			}

		//	scroll	//
		});
		
		public.$win.on(x_e('resize', _cfg), function(){
			public.data = get_winSize(public);

			if(public.onDebug){
				$('.xr_debug .xr_scroll').text(public.data.scroll);
			}

		//	resize	//
		});

		return tl;
	};
	
	
	$.xRoll.defaults = {
/*
		滚动容器 (默认值: $(window))
			@	[字符串] 应为 '.class' 或 '#id'，以某元素 scroll 事件触发
			@	[jq对象] 应为 $(.class) 或 $(#id)，以某元素 scroll 事件触发
*/
		container: public.$win,
		item: {
/*
		运动元素 (默认值: null)
			@	[字符串] 应为 '.class' 或 '#id'，多个运动元素逗号分隔 '.class1, .class2, ...'，排序决定运动次序
			@	[jq对象] 应为 $(.class) 或 $(#id)，多个运动元素逗号分隔 $('.class1, .class2, ...')，排序决定运动次序
			@	[对象]
*/
			elm: null,
/*
		元素排序 定义多个运动元素的动画执行顺序(默认值: null)
			@	[数组] 以下标在数组内的顺序排序
			@	[关键字] 关键字前加 '-' 表示倒序、降序
				's' / '-s' - 以当前选择器顺序排序
				't' / '-t' - 以元素 offsetTop 值排序
				'w' / '-w' - 以元素 width 值排序
				'h' / '-h' - 以元素 height 值排序
				'a' / '-a' - 以元素面积 width * height 值排序
				'r'				 - 以当前选择器随机乱序
*/
			sort: null
		},
		anchor: {
/*
		锚点位置 (默认值: 'self')
			@	[字符串] 应为 '.class' 或 '#id'
			@	[jq对象] 应为 $(.class) 或 $(#id)
			@	[整数] 距页面顶部的像素值
			@	[百分数] 文档高度的百分比
			@	[关键字]
				'self'    - 一个运动元素[item]时，取该元素自身的 offsetTop 值；多个运动元素时，取其中最小的 offsetTop 值
				'each'    - 一个运动元素[item]时，同 [self]；多个运动元素时，取各自的 offsetTop 值
				'pN'			- 一个运动元素[item]时，取该元素父N级元素的 offsetTop 值；多个非同一父级的运动元素时，取第一个运动元素父N级元素的 offsetTop 值
*/
			pin: 'self',
/*
			锚点偏移 基于 [pin] 取值的偏移像素值 (默认值: 0)
*/
			offset: 0
		},
		cursor: {
/*
			游标位置 (默认值: '90%')
				@ [整数] 距视口顶部的像素值
				@ [百分数] 为视口高度的百分比
*/
			point: '90%',
/*
			持续触发的长度或位置，此值大于 0 即开启步进模式 (默认值: 0)
				@ [整数] 长度像素值
				@ [字符串] 应为 '.class'或 '#id'，取对应元素的 offsetTop 值所在的位置
				@	[jq对象] 应为 $(.class) 或 $(#id)，取对应元素的 offsetTop 值所在的位置
*/
			long: 0
		},
/*
		运动属性
			@ [对象]
			@ [数组] 包含多组运动属性对象，表现为分步动画
*/
//		trans: {
//			dur: 1,												//	设定执行动画的时间，默认 1s
//			stag: 0.3,										//	序列运动的间隔时间，默认 0.3s
//			space: 0,											//	分步运动的间隔时间，默认 0s
//			attr: {												//	设定需要做动画的属性
//				ease: Back.easeOut.config(1.5)
//			}
//		},
		mobile: false 									//	是否支持移动端动画（回调函数仍可执行）
	};
	
	$.xRoll.configs = {
		debug: false, 									//	是否显示调试器
		className: {
			c1: 'xr_act',									//	锚点到达游标位置时 锚点的class
			c2: 'xr_cur'									//	锚点到达游标位置时 元素的class
		},
		nameSpace: 'xroll'							//	事件命名空间
	};
	
	$.xRoll.preset = {								//	预设动画
		left: {													//	左侧滑入
			attr: {
				x: '-30%',
			}
		}, 								
		right: {												//	右侧滑入
			attr: {
				x: '30%',
			}
		}, 								
		top: {													//	上方滑入
			attr: {
				y: '-30%',
			}
		}, 								
		bottom: {												//	下方滑入
			attr: {
				y: '30%',
			}
		}								
	};
	
	$.xRoll.tl = public.tl;
		
	//	状态管理
	function state(tl, st, opt, cfg, sd){
		if(public.$body.data('locked')){
			return false;
		}

		if(st >= opt.pos && !sd.in){
			sd.in = true;
			sd.out = false;
			sd.once = true;
			
			if(!is_null(tl)){
				tl.play();
			}
			
			if(is_jquery(opt.anchor.pin)){
				opt.anchor.pin.addClass(cfg.className.c1);
			}
			
			if(is_jquery(opt.item.elm)){
				opt.item.elm.addClass(cfg.className.c2);
			}
			
			if(is_function(opt.onIn)){
				opt.onIn({item: opt.item.elm});
			}
		}
		
		if(st < opt.anchor.val - public.data.wHeight && !sd.out && sd.once){		//	离视口退出
//		if(st < opt.pos && !sd.out && sd.once){														//	进入点退出
			sd.in = false;
			sd.out = true;
			
			if(!is_null(tl)){
				tl.pause(0);
//				tl.reverse();
			}
			
			if(is_jquery(opt.anchor.pin)){
				opt.anchor.pin.removeClass(cfg.className.c1);
			}
			
			if(is_jquery(opt.item.elm)){
				opt.item.elm.removeClass(cfg.className.c2);
			}
			
			if(is_function(opt.onOut)){
				opt.onOut({item: opt.item.elm});
			}
		}
		
		if((opt.cursor.long > 0) && (st >= opt.pos) && (st <= opt.cursor.long + opt.pos)){
			sd.over = true;
			
			if(is_function(opt.onOver)){
				opt.onOver({
					item: opt.item.elm,
					pos: (st - opt.pos) < 0 ? 0 : ((st - opt.pos) > opt.cursor.long ? opt.cursor.long : (st - opt.pos)),
					prg: (st - opt.pos)/opt.cursor.long < 0 ? 0 : ((st - opt.pos)/opt.cursor.long > 1 ? 1 : (st - opt.pos)/opt.cursor.long),
					over: sd.over
				});
			}
		}else{
			if(is_function(opt.onOver) && sd.over){
				sd.over = false;
				opt.onOver({
					item: opt.item.elm,
					pos: (st - opt.pos) < 0 ? 0 : ((st - opt.pos) > opt.cursor.long ? opt.cursor.long : (st - opt.pos)),
					prg: (st - opt.pos)/opt.cursor.long < 0 ? 0 : ((st - opt.pos)/opt.cursor.long > 1 ? 1 : (st - opt.pos)/opt.cursor.long),
					over: sd.over
				});
			}
		}
		
//		if(!is_null(tl)){
//			if((st < opt.anchor.val - public.data.wHeight) && tl.reversed()){
//				tl.seek(0);
//			}
//		}
	}
			
	//	获取动画动作数据
	function get_transData(o_trans, data){
		var arr = [],
				trans = {
					dur: 1,												//	设定执行动画的时间，默认 1s
					stag: -1,										//	序列运动的间隔时间，默认 trans.dur
					space: 0,											//	分步运动的间隔时间，默认 0s
					attr: {												//	设定需要做动画的属性
						ease: Back.easeOut.config(1.5)
					}
				};

		if(is_function(o_trans)){
			o_trans(data);
			return o_trans;
		}
			
		if(!is_array(o_trans)){
			arr.push(o_trans);
		}else{
			arr = arr.concat(o_trans);
		}
		
		for(var i = 0; i < arr.length; i++){
			if(is_string(arr[i])){
				if(is_undefined($.xRoll.preset[arr[i]])){
					debug(true, '配置项[trans]设置值"'+ arr[i] +'"关键字不存在！');
				}else{
					if(i > 0){
						arr[i] = $.extend(true, {}, trans, $.xRoll.preset[arr[i]]);
					}else{
						arr[i] = $.extend(true, {}, trans, {attr: {autoAlpha: 0}}, $.xRoll.preset[arr[i]]);
					}
				}
			}else if(is_object(arr[i])){
				if(is_undefined(arr[i].attr) && is_undefined(arr[i].dur) && is_undefined(arr[i].stag) && is_undefined(arr[i].space)){
					arr[i] = {attr: arr[i]};
				}
				
				if(i > 0){
					arr[i] = $.extend(true, {}, trans, arr[i]);
				}else{
					arr[i] = $.extend(true, {}, trans, {attr: {autoAlpha: 0}}, arr[i]);
				}
			}else{
				arr[i] = $.extend(true, {}, trans, {attr: {autoAlpha: 0}});
			}
			
			if(arr[i].stag < 0){
				arr[i].stag = arr[i].dur / 3;
			}
			
//			arr[i].attr.id = data.pos + 'step'
			if(!is_null(data.tl)){
				data.tl.staggerFrom(data.item, arr[i].dur, arr[i].attr, arr[i].stag, arr[i].space > 0 ? '+=' + arr[i].space : '-=' + Math.abs(arr[i].space));
			}
		}
		
		return arr;
	}
	
	//	格式化配置项
	function format_options(o){
		
		var _o = $.extend(true, {}, $.xRoll.defaults, o);
		
		if(is_string(_o.anchor.pin)){
			if(_o.anchor.pin.slice(-1) === '%'){
				_o.anchor.val = public.data.bHeight * parseFloat(_o.anchor.pin.slice(0, -1)) / 100;
			}else if(_o.anchor.pin === 'self'){
				if(is_jquery(_o.item.elm)){
					var limit = arr_limit(get_itemTopArr(_o.item.elm));

					_o.anchor.pin = _o.item.elm.eq(limit.minidx);
					_o.anchor.val = limit.min;
				}else if(is_object(_o.item.elm)){
					debug(true, '对象类型运动元素['+ JSON.stringify(_o.item.elm) +']不支持以关键字指定锚点[anchor.pin]');
				}
			}else if(_o.anchor.pin.length > 1 && _o.anchor.pin.indexOf('p') == 0){
				_o.anchor.pin = get_itemParent(_o);
				_o.anchor.val = _o.anchor.pin.offset().top;
			}else{
				_o.anchor.pin = $(_o.anchor.pin).eq(0);
				_o.anchor.val = _o.anchor.pin.offset().top;
			}
		}else if(is_jquery(_o.anchor.pin)){
			if(_o.anchor.pin.length === 0){
				debug(true, '配置项[anchor.pin]设置值"'+ _o.anchor.pin +'"所对应的元素不存在！');
				return;
			}else{
				_o.anchor.pin = _o.anchor.pin.eq(0);
				_o.anchor.val = _o.anchor.pin.offset().top;
			}
		}else if(is_number(_o.anchor.pin)){
			if(_o.anchor.pin < 1){
				_o.anchor.val = public.data.bHeight * _o.anchor.pin;
			}else{
				_o.anchor.val = _o.anchor.pin;
			}
		}
		
		if(is_object(_o.item.elm)){
			_o.item.elm = [_o.item.elm];
		}
		
		if(is_percentage(_o.cursor.point)){
			_o.cursor.point = public.data.wHeight * parseFloat(_o.cursor.point.slice(0, -1)) / 100;
		}
		
		_o.pos = _o.anchor.val + _o.anchor.offset - _o.cursor.point;
		
		if(_o.pos < 0){
			_o.pos = 0;
		}else if(_o.pos > public.data.max){
			_o.pos = public.data.max;
		}
		
		_o.pos = Math.floor(_o.pos);
		
		if(is_string(_o.cursor.long)){
			_o.cursor.long = $(_o.cursor.long);
		}
		
		if(is_jquery(_o.cursor.long) && _o.cursor.long.length > 0){
			_o.cursor.long = _o.cursor.long.offset().top - _o.cursor.point - _o.pos;
		}
		
		if(_o.cursor.long < 0){
			_o.cursor.long = 0;
		}else if(_o.cursor.long > public.data.max - _o.pos){
//			_o.cursor.long = public.data.max - _o.pos;
		}
		
		_o.cursor.long = Math.floor(_o.cursor.long);
		
		return _o;
	}
	
	//	元素排序
	function sortSelecter(e, s){
		var arr = ['t', 'w', 'h', 'a', 'r'];
		var rule = null;
		
		if(e.length > 1 && !is_undefined(s)){
			if(is_array(s)){
				$(e).each(function(i){
					if(s.indexOf(i) < 0){
						s.push(i);
					}
				});

				rule = function(o){
					return s.indexOf($(o).index());
				};
			}else if(is_string(s)){
				switch(arr.indexOf(s.slice(-1))){
					case 0:
						rule = function(o){
							return $(o).offset().top;
						};
						break;
					case 1:
						rule = function(o){
							return $(o).outerWidth();
						};
						break;
					case 2:
						rule = function(o){
							return $(o).outerHeight();
						};
						break;
					case 3:
						rule = function(o){
							return $(o).outerWidth() * $(o).outerHeight();
						};
						break;
					case 4:
						rule = function(o){
							return Math.random();
						};
						break;
					default:
						rule = function(o){
							return $(o).index();
						};
				}
			}
			
			e.sort(function(a, b){
				var r = rule(a) > rule(b);

				if(s.slice(0, 1) == '-'){
					r = !r;
				}

				return r;
			});			
		}
	}
	
	//	获取 offsetTop
	function get_itemTopArr(e){
		var arr = [];

		e.each(function(){
			arr.push($(this).offset().top);
		});

		return arr;
	}

	//	获取父级
	function get_itemParent(o){
		var pn = parseInt(o.anchor.pin.replace(/[^\d]/ig, ''));

		if(isNaN(pn) || pn === 0){
			pn = 1;
		}

		var $parent = o.item.elm.eq(0);

		for(var i = 0; i < pn; i++){
			$parent = $parent.parent();
		}

		if($parent.length === 0 || !$parent.offset()){
			debug(true, '配置项[anchor.pin]设置值"'+ o.anchor.pin +'"所对应的元素不存在！');
			return null;
		}
		
		return $parent;
	}
	
	//	调试模式
	function debugMode(o){
		public.count++;
		
		$('.xr_debug .xr_pin').append('<div style="position: absolute; right: 50px; top: ' + o.pos + 'px; padding: 0 10px; height: ' + o.cursor.long + 'px; background-color: rgba(212,247,106,0.5); border-top: 1px solid green; z-index: 999998;">锚点 #' + public.count + ' : ' + o.pos + '/' + o.cursor.long + '</div>');
		
		public.$win.on('resize', function(){
			$('.xr_debug .xr_pin div').eq(public.count - 1).css({top: o.pos + 'px', height: o.cursor.long + 'px'}).text('锚点 #' + public.count + ' : ' + o.pos + '/' + o.cursor.long);
		});
		
		console.log(o);
	}
	
	//	获取文档尺寸
	function get_winSize(t){
		return {
			wWidth: t.$win.width(),
			wHeight: t.$win.height(),
			dWidth: t.$doc.outerWidth(),
			dHeight: t.$doc.outerHeight(),
			bWidth: t.$body.outerWidth(),
			bHeight: t.$body.outerHeight(),
			max: Math.floor(t.$body.outerHeight() - t.$win.height()),
			scroll: t.$win.scrollTop() || 0,
			stamp: new Date().getTime()
		};
	}

	//	事件添加命名空间	[en-事件名称，cf-configs，ns-命名空间]
	function x_e(en, cf, ns){
		if (!is_boolean(ns)){
			ns = true;
		}
		
		if (ns){
			en = en +'.'+ cf.nameSpace;
		}
		
		return en;
	}
	
	function debug(d, m) {
		var s = '';
		
		if (!is_undefined(window.console) && !is_undefined(window.console.log)){
			if (is_object(d)){
				s = ' ['+d.selector+']';
				d = d.debug;
			}
			
			if (!d){
				return false;
			}
	
			m = 'xRoll' + s + ': ' + m;

			window.console.log(m);
		}
		return false;
	}
	
/*	工具函数	*/
	
	//	数组值比较 返回最大最小值及其索引的对象
	function arr_limit(arr){	
		var len = arr.length;
		var max = arr[0];
		var min = arr[0];
		var maxidx = 0;
		var minidx = 0;
		
		for (var i = 0; i < len; i++){
			if (arr[i] > max){
				max = arr[i]; 
			}else if (arr[i] < min){
				min = arr[i];	
			}
		}
		
		for (var x = 0; x < len; x++){
			if (max == arr[x]){   
				maxidx = x;
				break;
			}
		}
		
		for (var y = 0; y < len; y++){
			if (min == arr[y]){   
				minidx = y;
				break;
			}
		}
		
		return {min: min, minidx: minidx, max: max, maxidx: maxidx};
	}
	
	//	数组查重 返回包含非重复项及其索引的对象
	function arr_repeat(arr){
		var arr1 = [];
		var arr2 = [];
		var obj = {val: [], idx: []};
		var len = arr.length;

		for (var i = 0; i < len; i++) {
			if (arr1.indexOf(arr[i]) === -1) {
				arr1.push(arr[i]);
			}
		}
		
		obj.val.push(arr1);
		
    for(var m = 0, l = arr1.length; m < l; m++){
			arr2 = [];
			
			for(var n = 0; n < len; n++){
				if(arr1[m] === arr[n]){
					arr2.push(n);
				}
			}
			
			obj.idx.push(arr2);
    }

		return obj;
	}
	
	//	非等长数组元素的轮询
	function arr_cycle(arr1, arr2){
		var idx = 0, len = arr2.length, obj = [];
		
		for(var i1 = 0, i2 = arr1.length; i1 < i2; i1++){
			
			idx = i1%len;
			
			obj.push({arr1: arr1[i1], arr2: arr2[idx]});
		}
		
		return obj;
	}
})(jQuery);
