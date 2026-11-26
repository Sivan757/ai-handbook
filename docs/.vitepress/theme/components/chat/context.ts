import type { InjectionKey } from "vue"

/** 消息在对话框组件里时，隐藏每条消息的角色标签，靠对齐和底色区分角色。 */
export const chatThreadKey: InjectionKey<boolean> = Symbol("chat-thread")
