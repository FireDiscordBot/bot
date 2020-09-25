export const errorHtml = `<html>

<head>
  <title data-react-helmet="true">{API_PAGE_TITLE}</title>
  <meta data-react-helmet="true" name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta data-react-helmet="true" charset="utf-8">
  <link data-react-helmet="true" rel="stylesheet"
    href="https://fonts.googleapis.com/css?family=Source+Code+Pro:500&amp;display=swap">
  <link data-react-helmet="true" rel="stylesheet" href="https://static.inv.wtf/css/emojione-sprite-40.min.css">
  <link data-react-helmet="true" rel="icon" href="https://api.gaminggeek.dev/avatar">
  <style data-react-helmet="true" type="text/css">
    @font-face {
      font-family: "Roboto";
      src: local("Roboto"), local("Roboto-Regular"), url(https://static.inv.wtf/fonts/fc3d4b35e4d07d4e0485cc2db0e57c77.woff) format('woff');
      font-weight: 400;
      font-display: swap;
    }

    @font-face {
      font-family: "Roboto";
      src: local("Roboto Medium"), local("Roboto-Medium"), url(https://static.inv.wtf/fonts/f4fa50c4003f87e7dc10459e500933c3.woff) format('woff');
      font-weight: 500;
      font-display: swap;
    }

    @font-face {
      font-family: "Roboto";
      src: local("Roboto Bold"), local("Roboto-Bold"), url(https://static.inv.wtf/fonts/72e37e5bf95a8dba938c78b1d7d91253.woff) format('woff');
      font-weight: 700;
      font-display: swap;
    }
  </style>
  <style data-react-helmet="true" type="text/css">
    @font-face {
      font-family: "Content-font";
      src: local("Roboto"), local("Roboto-Regular"), url(https://static.inv.wtf/fonts/fc3d4b35e4d07d4e0485cc2db0e57c77.woff) format('woff');
      font-weight: 400;
      font-display: swap;
    }

    @font-face {
      font-family: "Content-font";
      src: local("Roboto Medium"), local("Roboto-Medium"), url(https://static.inv.wtf/fonts/f4fa50c4003f87e7dc10459e500933c3.woff) format('woff');
      font-weight: 500;
      font-display: swap;
    }

    @font-face {
      font-family: "Content-font";
      src: local("Roboto Bold"), local("Roboto-Bold"), url(https://static.inv.wtf/fonts/72e37e5bf95a8dba938c78b1d7d91253.woff) format('woff');
      font-weight: 700;
      font-display: swap;
    }
  </style>
  <script data-react-helmet="true" type="0c0a5b64753d97fefbd6b01a-text/javascript" defer="true"
    src="https://polyfill.io/v3/polyfill.min.js?flags=gated&amp;features=Intl"></script>
  <style>
    #root {
      width: 100%;
      height: 100%;
      display: flex;
    }
  </style>
  <style>
    #client_root {
      width: 100%;
      min-height: 100%;
      height: initial;
      display: flex;
    }
  </style>
  <style>
    #root {
      width: 100%;
      height: 100%;
      display: flex
    }

    #client_root {
      width: 100%;
      min-height: 100%;
      height: initial;
      display: flex
    }

    @font-face {
      font-family: Content-font;
      src: local("Roboto"), local("Roboto-Regular"), url(https://static.inv.wtf/fonts/fc3d4b35e4d07d4e0485cc2db0e57c77.woff) format('woff');
      font-weight: 400;
      font-display: swap
    }

    @font-face {
      font-family: Content-font;
      src: local("Roboto Medium"), local("Roboto-Medium"), url(https://static.inv.wtf/fonts/f4fa50c4003f87e7dc10459e500933c3.woff) format('woff');
      font-weight: 500;
      font-display: swap
    }

    @font-face {
      font-family: Content-font;
      src: local("Roboto Bold"), local("Roboto-Bold"), url(https://static.inv.wtf/fonts/72e37e5bf95a8dba938c78b1d7d91253.woff) format('woff');
      font-weight: 700;
      font-display: swap
    }

    @font-face {
      font-family: Roboto;
      src: local("Roboto"), local("Roboto-Regular"), url(https://static.inv.wtf/fonts/fc3d4b35e4d07d4e0485cc2db0e57c77.woff) format('woff');
      font-weight: 400;
      font-display: swap
    }

    @font-face {
      font-family: Roboto;
      src: local("Roboto Medium"), local("Roboto-Medium"), url(https://static.inv.wtf/fonts/f4fa50c4003f87e7dc10459e500933c3.woff) format('woff');
      font-weight: 500;
      font-display: swap
    }

    @font-face {
      font-family: Roboto;
      src: local("Roboto Bold"), local("Roboto-Bold"), url(https://static.inv.wtf/fonts/72e37e5bf95a8dba938c78b1d7d91253.woff) format('woff');
      font-weight: 700;
      font-display: swap
    }

    body,
    html {
      color: #242a31;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      font-size: 15px;
      background: #f5f7f9;
      box-sizing: border-box;
      font-family: Roboto, sans-serif;
      line-height: 1em;
      text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-text-size-adjust: 100%
    }

    @media screen and (min-width:768px) {

      body,
      html {
        text-rendering: optimizeLegibility
      }
    }

    @media print {

      body,
      html {
        background: 0 0
      }
    }

    *,
    :after,
    :before {
      outline: 0;
      box-sizing: inherit
    }

    @font-face {
      font-family: Flow-Rounded;
      src: url(https://static.inv.wtf/fonts/bfc0a96537ceb0cad9e956b9f980fe88.woff) format('woff');
      font-display: block
    }

    input,
    select,
    textarea {
      font-size: 16px
    }

    button,
    input,
    select,
    textarea {
      font: inherit
    }

    input[type=search] {
      -webkit-appearance: none
    }

    .draggingElement,
    .draggingElement :hover {
      cursor: grabbing !important;
      pointer-events: auto !important
    }

    .draggingElement .draggingHidden {
      display: none
    }

    .reset-3c756112--body-68cac36c {
      display: -webkit-box;
      display: -moz-box;
      display: -ms-flexbox;
      display: -webkit-flex;
      color: #242a31;
      width: 100%;
      margin: 0;
      display: flex;
      padding: 0;
      background: #202223;
      min-height: 100vh;
      flex-direction: column;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal
    }

    .reset-3c756112--bodyContent-2f98451b {
      display: -webkit-box;
      display: -moz-box;
      display: -ms-flexbox;
      display: -webkit-flex;
      flex: 1;
      background-color: #202223;
      width: 100%;
      margin: 0 auto;
      display: flex;
      padding: 0
    }

    .reset-3c756112--S400Vertical-a18add7e--modalWrapper-17a261ef {
      display: -webkit-box;
      display: -moz-box;
      display: -ms-flexbox;
      display: -webkit-flex;
      flex: 1;
      margin: 0;
      display: flex;
      padding: 0;
      max-width: 100%;
      margin-top: 32px;
      margin-bottom: 32px;
      flex-direction: column;
      pointer-events: none;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal
    }

    .reset-3c756112--modal-42d48c56--medium-2783a148--body-1598594a {
      display: -webkit-box;
      display: -moz-box;
      display: -ms-flexbox;
      display: -webkit-flex;
      width: 100%;
      margin: auto;
      display: flex;
      padding: 0;
      overflow: hidden;
      max-width: 600px;
      background: #fff;
      box-shadow: 0 3px 8px 0 rgba(116, 129, 141, .1);
      align-items: stretch;
      border-radius: 4px;
      flex-direction: column;
      pointer-events: auto;
      -webkit-box-align: stretch;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal
    }

    @media screen and (max-width:767px) {
      .reset-3c756112--modal-42d48c56--medium-2783a148--body-1598594a {
        flex-direction: column;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal
      }
    }

    .reset-3c756112--S400Vertical-30cd3a45--S500Horizontal-b3653d1c--modalHeader-12b621e6 {
      display: -webkit-box;
      display: -moz-box;
      display: -ms-flexbox;
      display: -webkit-flex;
      background-color: #121212;
      margin: 0;
      display: flex;
      padding: 0;
      align-items: center;
      padding-top: 32px;
      padding-left: 40px;
      padding-right: 40px;
      flex-direction: row;
      padding-bottom: 32px;
      -webkit-box-align: center;
      -webkit-box-orient: horizontal;
      -webkit-box-direction: normal
    }

    .reset-3c756112--modalHeaderMain-756c9114--header-3d212bb1 {
      display: -webkit-box;
      display: -moz-box;
      display: -ms-flexbox;
      display: -webkit-flex;
      flex: 1;
      cursor: pointer;
      margin: 0;
      display: flex;
      padding: 0;
      align-items: center;
      -webkit-box-align: center
    }

    .reset-3c756112--tooltipContainer-7fdb9b70--medium-296350e4--S100Right-66923e31 {
      display: -webkit-box;
      display: -moz-box;
      display: -ms-flexbox;
      display: -webkit-flex;
      width: 40px;
      height: 40px;
      margin: 0;
      display: flex;
      padding: 0;
      margin-right: 8px;
      border-radius: 3px
    }

    .reset-3c756112--avatarFrame-2f40cdc9--medium-296350e4 {
      display: -webkit-box;
      display: -moz-box;
      display: -ms-flexbox;
      display: -webkit-flex;
      -webkit-mask-image: -webkit-radial-gradient(white, #000);
      -webkit-mask-image: -moz-radial-gradient(white, #000);
      mask-image: -webkit-radial-gradient(white, #000);
      mask-image: -moz-radial-gradient(white, #000);
      width: 40px;
      height: 40px;
      margin: 0;
      display: flex;
      padding: 0;
      overflow: hidden;
      position: relative;
      mask-image: radial-gradient(white, #000);
      align-items: center;
      border-radius: 3px;
      justify-content: center;
      -webkit-box-pack: center;
      -webkit-box-align: center;
      -webkit-mask-image: radial-gradient(white, #000)
    }

    .image-67b14f24--avatar-1c1d03ec {
      width: 100%;
      height: 100%;
      max-width: 100%;
      background-size: cover;
      background-color: #fff;
      background-repeat: no-repeat
    }

    .reset-3c756112--headerTitle-756c9114 {
      flex: 1;
      margin: 0;
      display: block;
      padding: 0
    }

    .text-4505230f--DisplayH700-a03ad9b4--textUIFamily-5ebd8e40 {
      font-size: 24px;
      font-family: Roboto, sans-serif;
      font-weight: 500;
      line-height: 1.5;
      color: #ffffff;
    }

    .reset-3c756112--modalBody-7058100e {
      flex: auto;
      margin: 0;
      display: block;
      padding: 0;
      overflow: auto;
      position: relative;
      border-top: 1px solid;
      background-color: #121212;
      max-height: calc(100vh - 200px - 48px)
    }

    .reset-3c756112--modalBodyInner-ecc3d9a8--S400Vertical-30cd3a45--S500Horizontal-b3653d1c {
      display: -webkit-box;
      display: -moz-box;
      display: -ms-flexbox;
      display: -webkit-flex;
      margin: 0;
      display: flex;
      padding: 0;
      padding-top: 32px;
      padding-left: 40px;
      padding-right: 40px;
      flex-direction: column;
      padding-bottom: 32px;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal
    }

    .text-4505230f--HeadingH600-23f228db--textUIFamily-5ebd8e40 {
      font-size: 20px;
      font-family: Roboto, sans-serif;
      font-weight: 700;
      line-height: 1.5;
      color: #ffffff;
    }

    .text-4505230f--TextH400-3033861f--textUIFamily-5ebd8e40--greyBase-2c5d8183 {
      color: #9daab6;
      font-size: 16px;
      font-family: Roboto, sans-serif;
      font-weight: 400;
      line-height: 1.625
    }

    .reset-3c756112--modalFooterWrapper-0ece75fa--S300Vertical-59663cf2--S500Horizontal-b3653d1c {
      margin: 0;
      display: block;
      padding: 0;
      position: relative;
      background-color: #121212;
      border-top: 1px solid;
      padding-top: 24px;
      padding-left: 40px;
      padding-right: 40px;
      padding-bottom: 24px
    }

    .reset-3c756112--modalFooter-5a8954da {
      display: -webkit-box;
      display: -moz-box;
      display: -ms-flexbox;
      display: -webkit-flex;
      flex: auto;
      margin: 0;
      display: flex;
      padding: 0;
      flex-direction: row;
      justify-content: space-between;
      -webkit-box-pack: justify;
      -webkit-box-orient: horizontal;
      -webkit-box-direction: normal
    }

    .reset-3c756112 {
      margin: 0;
      display: block;
      padding: 0
    }

    .button-36063075--medium-6e2a217a--button-5f5907cd {
      display: -webkit-inline-box;
      display: -moz-inline-box;
      display: -ms-inline-flexbox;
      display: -webkit-inline-flex;
      color: #fff;
      border: 1px solid;
      cursor: pointer;
      height: 40px;
      display: inline-flex;
      outline: 0;
      padding: 0 24px;
      transition: all 250ms ease-out;
      align-items: center;
      line-height: 1em;
      white-space: nowrap;
      border-color: transparent;
      border-radius: 3px;
      -moz-transition: all 250ms ease-out;
      justify-content: center;
      text-decoration: none;
      -webkit-box-pack: center;
      background-color: #3884ff;
      -webkit-box-align: center;
      -webkit-transition: all 250ms ease-out
    }

    .button-36063075--medium-6e2a217a--button-5f5907cd:disabled {
      opacity: .5;
      pointer-events: none
    }

    .button-36063075--medium-6e2a217a--button-5f5907cd:hover {
      background-color: #1f65d6
    }

    .text-4505230f--UIH400-4e41e82a--textUIFamily-5ebd8e40--text-8ee2c8b2 {
      font-size: 16px;
      font-family: Roboto, sans-serif;
      font-weight: 500;
      line-height: 1em
    }
  </style>
</head>

<body>
  <div id="root">
    <div class="reset-3c756112--body-68cac36c" data-reactroot="">
      <div class="reset-3c756112--bodyContent-2f98451b">
        <div class="reset-3c756112--S400Vertical-a18add7e--modalWrapper-17a261ef">
          <div class="reset-3c756112--modal-42d48c56--medium-2783a148--body-1598594a">
            <div class="reset-3c756112--S400Vertical-30cd3a45--S500Horizontal-b3653d1c--modalHeader-12b621e6"
              role="presentation">
              <div class="reset-3c756112--modalHeaderMain-756c9114--header-3d212bb1">
                <div class="reset-3c756112--tooltipContainer-7fdb9b70--medium-296350e4--S100Right-66923e31">
                  <div class="reset-3c756112--avatarFrame-2f40cdc9--medium-296350e4"><img
                      class="image-67b14f24--avatar-1c1d03ec" src="https://api.gaminggeek.dev/avatar"></div>
                </div>
                <div class="reset-3c756112--headerTitle-756c9114"><span
                    class="text-4505230f--DisplayH700-a03ad9b4--textUIFamily-5ebd8e40">{API_TITLE}</span></div>
              </div>
            </div>
            <div class="reset-3c756112--modalBody-7058100e">
              <div class="reset-3c756112--modalBodyInner-ecc3d9a8--S400Vertical-30cd3a45--S500Horizontal-b3653d1c"><span
                  class="text-4505230f--HeadingH600-23f228db--textUIFamily-5ebd8e40">{API_ERROR_TITLE}</span><span
                  class="text-4505230f--TextH400-3033861f--textUIFamily-5ebd8e40--greyBase-2c5d8183">{API_ERROR_TEXT}</span></div>
            </div>
            <div class="reset-3c756112--modalFooterWrapper-0ece75fa--S300Vertical-59663cf2--S500Horizontal-b3653d1c">
              <div class="reset-3c756112--modalFooter-5a8954da">
                <div class="reset-3c756112"></div>
                <div class="reset-3c756112"><button class="button-36063075--medium-6e2a217a--button-5f5907cd" onclick="window.location.href='{API_REFERRAL}'""><span
                      class="text-4505230f--UIH400-4e41e82a--textUIFamily-5ebd8e40--text-8ee2c8b2">{API_BUTTON}</span></button></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</body>

</html>
`