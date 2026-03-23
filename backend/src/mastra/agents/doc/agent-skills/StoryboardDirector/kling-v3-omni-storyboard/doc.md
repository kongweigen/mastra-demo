案例 1，角色图
@主体1
 https://docs.qingque.cn/image/api/convert/loadimage?id=-4532385154320097483fcABhdIKIDgfNoS5Pa6vdtMcj&identityId=2Cn18n4EIHT&docId=eZQDPQ5RCKYKpTbz1poE88YSp
@主体2
 https://docs.qingque.cn/image/api/convert/loadimage?id=-6688873860446510357fcABhdIKIDgfNoS5Pa6vdtMcj&identityId=2Cn18n4EIHT&docId=eZQDPQ5RCKYKpTbz1poE88YSp


视频提示词
镜头1，3s 全景，深夜霓虹闪烁的街角，路面湿漉漉的有倒影。@主体1 靠在红色电话亭旁抽烟，画面有强烈的拖影感。
镜头2，2s 切特写，@主体1 的侧脸隐藏在阴影里，他低着头，问，“你还没决定好要走哪条路吗？”
镜头3，4s 切特写 @主体2，特写的嘴唇和晃动的耳环。她低头拨弄着一枚硬币，说，“我听说有一个地方，那里的人从不问路。”
镜头4，3s 切中景，@主体1 自嘲地笑了一下，吐出一口烟雾，烟雾遮住了他的脸，说“那种地方，一定很寂寞”。
镜头5，3s 切远景，@主体1 和 @主体2两人面对面站着，中间隔着川流不息的模糊车灯。背景音是嘈杂的市声突然静止，两人慢慢消失在光晕里。

-----

案例 2 ，宫格图 + 角色

@Image（参考图）
https://docs.qingque.cn/image/api/convert/loadimage?id=5167751216988102571fcAC1cNSPPhD7sWpI_vhCTSlA&identityId=2Cn18n4EIHT&docId=eZQDPQ5RCKYKpTbz1poE88YSp

@Goro
https://docs.qingque.cn/image/api/convert/loadimage?id=-5029203666487671519fcAC1cNSPPhD7sWpI_vhCTSlA&identityId=2Cn18n4EIHT&docId=eZQDPQ5RCKYKpTbz1poE88YSp

@Kaiko
https://docs.qingque.cn/image/api/convert/loadimage?id=-317041014223533139fcAC1cNSPPhD7sWpI_vhCTSlA&identityId=2Cn18n4EIHT&docId=eZQDPQ5RCKYKpTbz1poE88YSp


视频提示词 

[00:00 - 00:02] Medium shot:
@Goro, gestures emphatically with a lit cigarette walking towards a locker, smoke curling around his hand as he punctuates each beat of his point. Audio: The faint, organic crackle of the cigarette tip under his words.
[00:02 - 00:04] Close-up:
@Goro weathered face fills the frame—eyes wide, intensity sharpened, jaw working as he speaks like he’s carving the truth into the air. Audio: Cigarette crackle continues; room tone low and tight.
[00:04 - 00:06] Cutaway: 
@Kaiko, a young woman with a blonde buzzcut and a scar on her eyebrow, looks down at her athletic-taped hands—stoic, absorbing, refusing to react. Audio: Crackle softens slightly; her breath is barely audible.
[00:06 - 00:08] Close-up: Goro’s mouth forms the word “pop”—a small puff of white smoke escapes on the consonant. Audio: A tiny smoke-breath exhale overlays the cigarette’s crackle.
[00:08 - 00:10] Medium shot:
@Goro leans his back against a row of dented industrial metal lockers, crossing his arms while still holding the cigarette—settling into authority, like the room belongs to him.— Goro:“You opened it—pop—and heat hit your face. Now? Wax paper. Burger sweats, gets soggy. Bun dissolves into meat. Mush of good intentions. No boundary. No definition.”
@Image


----
文档： 
https://app.klingai.com/cn/dev/document-api/apiReference/model/OmniVideo

图片/主体参考
参考图片/主体里的角色/道具/场景等多种元素，灵活生成视频

curl --location 'https://api-beijing.klingai.com/v1/videos/omni-video' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
    "model_name": "kling-video-o1",
    "prompt": "<<<image_1>>>在东京的街头漫步，偶遇<<<element_1>>>和<<<element_2>>>，并跳到<<<element_2>>>的怀里。视频画面风格与<<<image_2>>>相同",
    "image_list": [
        {
        	"image_url": "xxxxx"
        },
        {
        	"image_url": "xxxxx"
        }
    ],
    "element_list": [
        {
        	"element_id": long
        },
        {
        	"element_id": long
        }
    ],
    "mode": "pro",
    "aspect_ratio": "1:1",
    "duration": "7"
}'