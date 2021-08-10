<template>
  <div
    class="vue-player-container"
    :class="{ 'vue-playing' : isPlay }"
  >
    <audio v-if="type === 'audio'" class="media-player" :src="url" ref="mediaPlayer"></audio>
    <video v-if="type === 'video'" class="media-player" :src="url" ref="mediaPlayer"></video>
    <slot></slot>
    <div class="ap-controls-panel">
      <div class="ap-panel-bg"></div>
      <div class="ap-playtoggle" @click="playToggle"></div>
      <span class="ap-timelabel">{{ mediaCurrentTime }} / {{ mediaDuration }}</span>
      <div class="ap-timeline">
        <div class="ap-slider" @mousedown="progressMousedownHandler">
          <div class="ap-slider-track" :style="{width: currentTimeProgress }"></div>
          <div class="ap-slider-thumb" :style="{left: currentTimeProgress }"></div>
        </div>
      </div>
      <div class="ap-volume" :class="{ 'ap-volume-muted' : volume === 0 }" @mousedown="volumeMousedownHandler">
        <div class="ap-volume-bg"></div>
        <div class="ap-slider-vertical">
          <div class="ap-slider-track" :style="sliderTrackStyle"></div>
          <div class="ap-slider-thumb" :style="sliderThumbStyle"></div>
        </div>
        <span class="ap-volume-icon" @click="muted"></span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VueVplayer',
  props: {
    type: {
      type: String,
      default: 'audio' // audio || video
    },
    url: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      mediaPlayer: null,
      volume: 30, // 声音大小
      originalVolume: 30, // 声音大小（未静音之前的声音大小）
      currentTime: 0, // 音频当前播放时长
      duration: '', // 音频的总时长
      isPlay: false, // 播放状态
      canSetVolume: false, // 设置音量的小点是否被按下
      canUpdateProgress: false, // 设置进度的小调是否被摁下
      mousemoveHandler: null // 在此定义方法是为了在组件销毁时能够移除监听
    }
  },
  computed: {
    sliderTrackStyle () {
      return { height: this.volume + '%' }
    },
    sliderThumbStyle () {
      return { top: (100 - this.volume) + '%' }
    },
    // 当前进度百分比
    currentTimeProgress () {
      if (this.currentTime && this.duration) {
        return Number(((this.currentTime * 100) / this.duration).toFixed(2)) + '%'
      } else {
        return '0'
      }
    },
    // 音频总时长（用于界面显示）
    mediaDuration () {
      if (this.duration) {
        return formatSecond(this.duration)
      } else {
        return '00:00'
      }
    },
    // 当前播放时长（用于界面显示）
    mediaCurrentTime () {
      if (this.currentTime) {
        return formatSecond(this.currentTime)
      } else {
        return '00:00'
      }
    }
  },
  mounted () {
    this._initPlayer()
    this._initListen()
  },
  watch: {
    url (newV, oldV) {
      if (newV && newV !== oldV) {
        this._initPlayer()
      }
    },
    volume (v) {
      this.mediaPlayer.volume = v / 100
    }
  },
  methods: {
    progressMousedownHandler (event) {
      this.canUpdateProgress = true
      this.updateProgress(event)
    },
    progressMouseupHandler () {
      this.canUpdateProgress = false
    },
    progressMousemoveHandler (event) {
      if (this.canUpdateProgress) {
        this.updateProgress(event)
      }
    },
    volumeMousedownHandler (event) {
      if (event.target.className === 'ap-volume-icon') {
        return
      }
      this.canSetVolume = true
      this.setVolume(event)
    },
    volumeMouseupHandler () {
      this.canSetVolume = false
    },
    volumeMousemoveHandler (event) {
      if (this.canSetVolume) {
        this.setVolume(event)
      }
    },
    // 设置进度
    updateProgress (event) {
      // 类名为ap-slider的div距离浏览器左边距离
      const extraLeft = document.querySelector('.ap-slider').getBoundingClientRect().left
      // 鼠标点击处的x坐标（相对于浏览器窗口）
      const x = event.clientX
      // 类名为ap-slider的div宽度
      const sliderWidth = document.querySelector('.ap-slider').offsetWidth
      let processWidth = Number(x - extraLeft)
      processWidth = processWidth > sliderWidth ? sliderWidth : processWidth
      this.currentTime = Number(processWidth / sliderWidth * this.duration).toFixed(3)
      this.$refs.mediaPlayer.currentTime = this.currentTime
    },
    // 静音
    muted () {
      if (this.volume === 0) {
        this.volume = this.originalVolume
      } else {
        this.originalVolume = this.volume
        this.volume = 0
      }
    },
    // 设置音量
    setVolume (event) {
      // 类名为ap-slider-vertical的div距离浏览器顶部距离
      const extraTop = document.querySelector('.ap-slider-vertical').getBoundingClientRect().top
      // 鼠标的y坐标（相对于浏览器窗口）
      const y = event.clientY
      // 类名为ap-slider-vertical的div高度
      const sliderHeight = document.querySelector('.ap-slider-vertical').offsetHeight
      let volumeHeight = sliderHeight + extraTop - y
      volumeHeight = volumeHeight > sliderHeight ? sliderHeight : volumeHeight
      let volume = Number(volumeHeight / sliderHeight * 100).toFixed(2)
      volume = volume > 100 ? 100 : volume < 0 ? 0 : volume
      this.volume = volume
    },
    // 播放/暂停
    playToggle () {
      if (this.isPlay) {
        this.mediaPlayer.pause()
        this.isPlay = false
      } else {
        this.mediaPlayer.play()
        this.setMediaInterval()
        this.isPlay = true
      }
    },
    // 设置定时检测
    setMediaInterval () {
      const mediaInterval = setInterval(() => {
        this.currentTime = this.mediaPlayer.currentTime
        if (this.mediaPlayer.ended || !this.isPlay) {
          // 播放结束后重置数据
          clearInterval(mediaInterval)
        }
      }, 1000)
    },
    _initPlayer () {
      if (!this.url) {
        return
      }
      const mediaPlayer = this.$refs.mediaPlayer
      // 监听播放器是否加载完毕
      mediaPlayer.addEventListener('canplay', () => {
        this.mediaPlayer = mediaPlayer
        this._getVideoTime()
      })
      mediaPlayer.addEventListener('ended', () => {
        this.isPlay = false
      })
    },
    // 设置鼠标监听事件
    _initListen () {
      window.addEventListener('mousemove', this._throttle())
      window.addEventListener('mouseup', this._mouseupHandler)
    },
    // 节流
    _throttle () {
      const delay = 10
      let frontTime = new Date().getTime()
      const _this = this
      this.mousemoveHandler = function (event) {
        const currentTime = new Date().getTime()
        if (currentTime - frontTime < delay) {
          return false
        }
        frontTime = new Date().getTime()
        _this.progressMousemoveHandler(event)
        _this.volumeMousemoveHandler(event)
      }
      return this.mousemoveHandler
    },
    _mouseupHandler () {
      this.progressMouseupHandler()
      this.volumeMouseupHandler()
    },
    // 获取播放时间
    _getVideoTime () {
      const mediaPlayer = this.mediaPlayer
      this.duration = mediaPlayer.duration
      this.currentTime = mediaPlayer.currentTime
    }
  },
  beforeDestroy () {
    window.removeEventListener('mousemove', this.mousemoveHandler)
    window.removeEventListener('mouseup', this._mouseupHandler)
  }
}

// 格式化秒
function formatSecond (second) {
  var secondType = typeof second
  if (secondType === 'number' || secondType === 'string') {
    second = parseInt(second)
    var mimute = Math.floor(second / 60)
    second = second - mimute * 60
    return ('0' + mimute).slice(-2) + ':' + ('0' + second).slice(-2)
  } else {
    return '00:00'
  }
}
</script>

<style lang="scss">
.vue-player-container {
  height: 100%;
  width: 100%;
  position: relative;
  background: #000;
}
.media-player{
  width: 100%;
}
.video-player-container video {
  height: 100%;
  width: 100%;
  display: block;
  overflow: hidden
}

.ap-controls-panel {
  user-select: none;
  position: absolute;
  bottom: 0;
  width: 100%;
  font-size: 16px;
  height: 3em;
  z-index: 1000
}

.ap-panel-bg {
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  background-color: #242424;
  opacity: .8;
  filter: alpha(opacity=80);
  z-index: 1000
}

.ap-playtoggle {
  cursor: pointer;
  position: relative;
  z-index: 1001;
  width: 3em;
  height: 100%;
  float: left;
  background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMzYgMzYiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+DQogICAgPHBhdGggZD0iTTExLDEwIEwxOCwxMy43NCAxOCwyMi4yOCAxMSwyNiBNMTgsMTMuNzQgTDI2LDE4IDI2LDE4IDE4LDIyLjI4IiBmaWxsPSIjZmZmIj48L3BhdGg+DQo8L3N2Zz4=);
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAD9CzEMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAKqNIzIAAAAJcEhZcwAAAFoAAABaAHAjuH0AAAAHdElNRQfgBRQSOydLEdPXAAABmUlEQVRYw+2Wu0oDQRhGz2oIEhAtBEHRQpIIXtAH0M7Kd7DQQl/BV/BlFEEsBO9IUAmI8X5Bi6RQoqgYJYr5LMISE5LdmZhyT7mzO9/8Z3b/WQgICAjwxak9JLPbfGiqfwGNCBhkmj4cECqryJyQ52iMWeIccsI9eVfav4tyEZrSjwpKaUHj6lKLHFnXEvIZd3CI080k6yyRJGdryi8AIEyYdtoYZJ9NEnzYyDIJKM7VQw8DROnnmGseihJNY6oiNKWCyvnRq5Y1o6jaFXJ3xMuaaQUuTbQywSgXLLLGXeMU/ZUVoZcOOhljj23OXVnVVdkHFIkwwgBDxEhwRpq3OuaougeV5HWsefXX3ge/XmQiOezloV5FAN+cssEB52QaH/DBNanSJjcyQHySrXxNa39stgEF3tlimR2yvJs8YBfwRIJ1klzyWLro3SpMA0SaG5LssMuL2dTmAV/kyJS3a/MG5xcg4IpVVrjlmbz9uekdkOOILRKkikemuRgjhIY1p7ia7Q/KEn7/RY6t80r8elF9yw4ICAiw4xcxfsNvJiWE7gAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAxNi0wNS0yMFQxODo1OToxOCswODowMJKBy7cAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMTYtMDUtMjBUMTg6NTk6MzkrMDg6MDAHjn/CAAAAPHRFWHRzdmc6YmFzZS11cmkAZmlsZTovLy9EOi9zcGFjZS92Y19wbGF5ZXIvc3JjL2ltZy9wbGF5X2J0bi5zdmedrkudAAAAAElFTkSuQmCC) \0
}

.ap-playtoggle:focus, .ap-playtoggle:hover {
  background-color: #708090;
  opacity: .9;
  filter: alpha(opacity=90)
}

.touchable .ap-playtoggle:hover {
  background-color: transparent;
  opacity: 1
}

.vue-playing .ap-playtoggle {
  background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMzYgMzYiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+DQogICAgPHBhdGggZD0iTTExLDEwIEwxNywxMCAxNywyNiAxMSwyNiBNMjAsMTAgTDI2LDEwIDI2LDI2IDIwLDI2IiBmaWxsPSIjZmZmIj48L3BhdGg+DQo8L3N2Zz4=);
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAD9CzEMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAKqNIzIAAAAJcEhZcwAAAFoAAABaAHAjuH0AAAAHdElNRQfgBRQTADNsu4KlAAAAfklEQVRYw+2WsQ2AMAwEPyiZimloWIqOhjHYg1VAMi1Ejo2l0P2VH/kvnQ0QQohLaj9Jl6ocnBInDwpGzI+qgh0LxMhjCGSSN5skaeY6g+m4qn+dTh4WdIACCiiggAIKfEGulntxcrXC4sBaLXc7V/DuosDZolf9fngRQsgHbrk8P6SPYKxbAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE2LTA1LTIwVDE5OjAwOjI0KzA4OjAwi3r4LQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNi0wNS0yMFQxOTowMDo1MSswODowMKLaZi8AAAA8dEVYdHN2ZzpiYXNlLXVyaQBmaWxlOi8vL0Q6L3NwYWNlL3ZjX3BsYXllci9zcmMvaW1nL3N0b3BfYnRuLnN2Z0xvOgsAAAAASUVORK5CYII=) \0
}

.ap-slider {
  position: relative;
  z-index: 1001;
  float: left;
  background: #c4c4c4;
  height: 10px;
  opacity: .8;
  filter: alpha(opacity=80);
  cursor: pointer
}

.ap-slider .ap-slider-track {
  width: 0;
  height: 100%;
  margin-top: 0;
  opacity: 1;
  filter: alpha(opacity=100);
  background-color: #1e90ff
}

.ap-slider .ap-slider-thumb {
  cursor: pointer;
  background-color: #fff;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 1em !important;
  height: 10px;
  margin-left: -5px;
  width: 10px
}

.ap-slider-vertical {
  position: relative;
  width: .5em;
  height: 8em;
  top: -5.6em;
  z-index: 1001;
  background-color: #1c1c1c;
  opacity: .9;
  filter: alpha(opacity=90);
  cursor: pointer
}

.ap-slider-vertical .ap-slider-track {
  background-color: #1275cf;
  width: .5em;
  height: 100%;
  opacity: .8;
  filter: alpha(opacity=80)
}

.ap-slider-vertical .ap-slider-thumb {
  cursor: pointer;
  position: absolute;
  background-color: #f0f8ff;
  width: .8em;
  height: .8em;
  border-radius: .8em !important;
  margin-top: -.4em;
  top: 0;
  left: -.15em
}

.ap-timeline {
  top: -10px;
  left: 0;
  height: 10px;
  position: absolute;
  z-index: 1001;
  width: 100%
}

.ap-timeline .ap-slider-thumb {
  top: -4px
}

.ap-timeline .ap-slider {
  margin-top: 8px;
  height: 2px;
  width: 100%
}

.ap-timeline:hover .ap-slider {
  margin-top: 0;
  height: 10px
}

.ap-timeline:hover .ap-slider-thumb {
  display: block;
  width: 16px;
  height: 16px;
  top: -3px;
  margin-left: -8px
}

.ap-timelabel {
  display: inline-block;
  line-height: 3em;
  float: left;
  color: #fff;
  padding: 0 9px
}

.ap-timelabel, .ap-volume {
  height: 3em;
  z-index: 1001;
  position: relative
}

.ap-volume {
  width: 3em;
  cursor: pointer;
  float: right;
  background-color: transparent;
  opacity: .9;
  filter: alpha(opacity=90)
}

.ap-volume-icon {
  background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMzYgMzYiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+DQogICAgPHBhdGggZD0iTTEyLjM5LDE1LjU0IEwxMCwxNS41NCBMMTAsMjAuNDQgTDEyLjQsMjAuNDQgTDE3LDI1LjUwIEwxNywxMC40OCBMMTIuMzksMTUuNTQgWiIgb3BhY2l0eT0iMSIgZmlsbD0iI2ZmZiI+PC9wYXRoPg0KICAgIDxwYXRoIGQ9Ik0xMi4zOSwxNS41NCBMMTAsMTUuNTQgTDEwLDIwLjQ0IEwxMi40LDIwLjQ0IEwxNywyNS41MCBMMTcsMTAuNDggTDEyLjM5LDE1LjU0IFoiIG9wYWNpdHk9IjEiIGZpbGw9IiNmZmYiPjwvcGF0aD4NCiAgICA8cGF0aCBkPSJNMjIsMTcuOTkgQzIyLDE2LjQgMjAuNzQsMTUuMDUgMTksMTQuNTQgTDE5LDIxLjQ0IEMyMC43NCwyMC45MyAyMiwxOS41OSAyMiwxNy45OSBaIiBvcGFjaXR5PSIxIiBmaWxsPSIjZmZmIj48L3BhdGg+DQogICAgPHBhdGggZD0iTTIyLDE3Ljk5IEMyMiwxNi40IDIwLjc0LDE1LjA1IDE5LDE0LjU0IEwxOSwyMS40NCBDMjAuNzQsMjAuOTMgMjIsMTkuNTkgMjIsMTcuOTkgWiIgb3BhY2l0eT0iMSIgZmlsbD0iI2ZmZiI+PC9wYXRoPg0KPC9zdmc+);
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAD9CzEMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAKqNIzIAAAAJcEhZcwAAAFoAAABaAHAjuH0AAAAHdElNRQfgBR8OMR9bwV7WAAABiElEQVRYw+2WvS9DURiHn9sSbUMrrTZSsYgYSATBIkRYLI0JsfkDjCb+B4mFxeJjNVsMEkwmMRhMNloShg5K+zO4lV4ft6e9DJL7nO3c97zPOe/JOeeCj4+PT1UsszDVPsQm8NcrMBLY84+T+BOBnT7CDFM11sckud2aNalT7cuS96TfCBo1qhNJe7ULGgyKAyOsMFTuKPeaVesHgWOewyyRqYhsp0juPaa6xG0FMSJAhGUWHHFjtHBEloK3ElnMMQF00EfIsbRp5jljjSuKXgQwwCwFmmn61B8lwTjLbHFRXeB2DmJEaSP0pdAlIMYs3SYlchPIdVySsFeBOyWzsECd30rckjcRuG1yjiwvtBL+pAoC9xxw7VVwToAgXfSTdmz0E3ccs2km+AEhFFVKKXVqQzm9sytLKKNFpdUoPFx8qmy9Wle+QpBUvPzNM3aiQe3o8UPwW8kdK+nRoV5//bqu4IZVgvVMsYrAwj7Qz1yyXU9djF6Nj0ff4qHW35b//1/k4+PjY8AbQVScfN4fNOAAAAAldEVYdGRhdGU6Y3JlYXRlADIwMTYtMDUtMzFUMTQ6NDk6MDYrMDg6MDB87oydAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDE2LTA1LTMxVDE0OjQ5OjMxKzA4OjAwRpsNTAAAADp0RVh0c3ZnOmJhc2UtdXJpAGZpbGU6Ly8vRDovc3BhY2UvdmNfcGxheWVyL3NyYy9pbWcvdm9sdW1uLnN2Z7m8k5MAAAAASUVORK5CYII=) \0;
  display: inline-block;
  width: 3em;
  height: 3em;
  position: absolute;
  left: 0;
  top: 0
}

.ap-volume-muted .ap-volume-icon {
  background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMzYgMzYiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+DQogICAgPHBhdGggZD0iTTEyLjM5LDE1LjU0IEwxMCwxNS41NCBMMTAsMjAuNDQgTDEyLjQsMjAuNDQgTDE3LDI1LjUwIEwxNywxMC40OCBMMTIuMzksMTUuNTQgWiIgb3BhY2l0eT0iMSIgZmlsbD0iI2ZmZiI+PC9wYXRoPg0KICAgIDxwYXRoIGQ9Ik0xMi4zOSwxNS41NCBMMTAsMTUuNTQgTDEwLDIwLjQ0IEwxMi40LDIwLjQ0IEwxNywyNS41MCBMMTcsMTAuNDggTDEyLjM5LDE1LjU0IFoiIG9wYWNpdHk9IjEiIGZpbGw9IiNmZmYiPjwvcGF0aD4NCiAgICA8cGF0aCBkPSJNMTkuNjMsMTUuOTIgTDIwLjY4LDE0LjkzIEwyMi44MSwxNi45NCBMMjQuOTQsMTQuOTMgTDI2LDE1LjkyIEwyMy44NiwxNy45MyBMMjYsMTkuOTMgTDI0Ljk0LDIwLjkyIEwyMi44MSwxOC45MiBMMjAuNjgsMjAuOTIgTDE5LjYzLDE5LjkzIEwyMS43NiwxNy45MyBMMTkuNjMsMTUuOTIgWiIgb3BhY2l0eT0iMSIgZmlsbD0iI2ZmZiI+PC9wYXRoPg0KICAgIDxwYXRoIGQ9Ik0xOS42MywxNS45MiBMMjAuNjgsMTQuOTMgTDIyLjgxLDE2Ljk0IEwyNC45NCwxNC45MyBMMjYsMTUuOTIgTDIzLjg2LDE3LjkzIEwyNiwxOS45MyBMMjQuOTQsMjAuOTIgTDIyLjgxLDE4LjkyIEwyMC42OCwyMC45MiBMMTkuNjMsMTkuOTMgTDIxLjc2LDE3LjkzIEwxOS42MywxNS45MiBaIiBvcGFjaXR5PSIxIiBmaWxsPSIjZmZmIj48L3BhdGg+DQo8L3N2Zz4=);
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAD9CzEMAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAKqNIzIAAAAJcEhZcwAAAFoAAABaAHAjuH0AAAAHdElNRQfgBR8OMx9p9zxUAAAB3UlEQVRYw+2Wz0sVURTHP+PMw3joG39jWRGFLpQnIhZBEGEEuZBoERK0aNUqWrXyL3AVtWjnKjVaqOBChKJV8UJatAgraBUkgo8Cn2kk8b4uHMN5zcybO+pCmM/ZnXvv+Z5z7g8upKSkpFTFijdN5ks8ag67glgCXv5NNB+KgBc+y3UGDfsTJ7hndbqit5qUpf0HDRDI6ILeSJowF3BiNAfO85D+XUeQRHjnQgR8QQa4y3D1VIJFopa5ZIEs9xnxzbNxaaBEiS0ytGNT4qd5iyxucRnooIdjvpFGbnOHlzznM6cZ4zgzPEamAtDHDbaoo7bC/xuHPC04fOci1yhGHd7oFuUC/ZssMs0QNylzkmXmKSQTUKi/wBqdDOBQosAUH8KDJHuLamnGxQEynKMhampUBWHiLle5xxnesU6ebh7gMhdWb1QFRVZZZoPyf2u6uMQSUzzlBb/oI5+sgvfUYHOWXk74zsk6X3nFLK9ZYZEyOb4YN1kI5dSmNp3SExW1wzNZQqheHcrJFrLVqnbVC8M3SnutW4+04RMINKM9sDwD4BMTTLNWOVZpifiXX5cW9PfAn+s9fGMUO0mKVQQsvAv9h4+Mm+7kboQYjQKgCYsfpt+Wo/8vSklJSYnBNtEBsGU3qz6oAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE2LTA1LTMxVDE0OjUxOjA1KzA4OjAwn18JNAAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNi0wNS0zMVQxNDo1MTozMSswODowMJTCkngAAAA5dEVYdHN2ZzpiYXNlLXVyaQBmaWxlOi8vL0Q6L3NwYWNlL3ZjX3BsYXllci9zcmMvaW1nL211dGVkLnN2Z6SDmFIAAAAASUVORK5CYII=) \0
}

.ap-volume .ap-slider-vertical {
  top: -8.4em;
  left: 1em;
  visibility: hidden;
}

.ap-volume .ap-slider-track {
  position: absolute;
  bottom: 0
}

.ap-volume:hover .ap-slider-vertical {
  visibility: visible;
}

.ap-volume .ap-volume-bg {
  height: 8.8em;
  width: 2em;
  position: absolute;
  left: .25em;
  top: -8.8em;
  background: #242424;
  visibility: hidden;
}

.ap-volume:hover .ap-slider-vertical, .ap-volume:hover .ap-volume-bg {
  visibility: visible;
}
</style>
