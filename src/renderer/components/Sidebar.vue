<template>
  <aside class="sidebar">
    <div class="sidebar-logo">
      <span class="logo-icon">🩺</span>
      <div>
        <div class="logo-title">GitHub Doctor</div>
        <div class="logo-version">v0.1 · macOS / Windows</div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-group">
        <NavItem to="/" label="진단 대시보드" icon="✧" />
        <NavItem label="프로젝트 선택" icon="📁" disabled />
        <NavItem to="/account" label="계정 관리" icon="👤" />
      </div>
      <div class="nav-group">
        <NavItem to="/ssh" label="SSH 키 관리" icon="🔑" />
        <NavItem to="/credentials" label="인증정보 관리" icon="🔒" />
        <NavItem label="Remote 설정" icon="🔀" disabled />
        <NavItem label="배포 연동" icon="☁" disabled />
      </div>
      <div class="nav-group">
        <NavItem label="복구 히스토리" icon="🕓" disabled />
      </div>
    </nav>

    <div class="sidebar-footer">
      <NavItem label="환경설정" icon="⚙" disabled />
    </div>
  </aside>
</template>

<script setup>
import { h } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

// 이 컴포넌트가 하는 일: 메뉴 항목 하나 표시만.
// 아직 구현되지 않은 화면(SCR-02/03/05~08/10)은 disabled로 표시하고 라우팅하지 않는다 —
// 없는 라우트로 링크를 걸어 빈 화면을 보여주는 것보다 정직하다.
const NavItem = {
  props: { to: String, label: String, icon: String, disabled: Boolean },
  setup(props) {
    const route = useRoute();
    return () => {
      if (props.disabled) {
        return h('div', { class: 'nav-item nav-item-disabled', title: '아직 구현되지 않음' }, [
          h('span', { class: 'nav-icon' }, props.icon),
          props.label,
        ]);
      }
      const active = route.path === props.to;
      return h(
        RouterLink,
        { to: props.to, class: ['nav-item', active ? 'nav-item-active' : ''] },
        () => [h('span', { class: 'nav-icon' }, props.icon), props.label]
      );
    };
  },
};
</script>
