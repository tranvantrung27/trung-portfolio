import { social, projects, skillGroups, contact, footer } from '../config/content.js';

/**
 * Renders all dynamic content from content.js into the DOM.
 * HTML contains only structural shells — data comes from config.
 * @param {Function} onProjectClick - Callback when a project card is clicked
 */
export function renderContent(onProjectClick) {
  renderProjects(onProjectClick);
  renderSkills();
  renderContact();
  renderFooter();
}

function renderProjects(onProjectClick) {
  const grid = document.querySelector('.project-grid');
  if (!grid) return;
  grid.innerHTML = '';

  projects.forEach((project, i) => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.style.animationDelay = `${i * 0.1}s`;
    
    // Add click listener for the modal
    card.addEventListener('click', (e) => {
      // Don't open modal if clicking on a direct link
      if (e.target.closest('.project-links')) return;
      if (onProjectClick) onProjectClick(project, card);
    });

    const hasDemo = project.links?.demo;
    const hasGithub = project.links?.github;
    const hasLinks = hasDemo || hasGithub;

    card.innerHTML = `
      <div class="card-corner tl"></div>
      <div class="card-corner br"></div>
      <div class="card-glitch-overlay"></div>
      
      <div class="project-image">
        <img src="${project.image}" alt="${project.title}" loading="lazy" />
        <div class="image-scanline"></div>
      </div>
      
      <div class="project-body">
        <div class="project-tags">
          ${project.tags.map(t => `<span class="tag"><span class="tag-dot"></span>${t}</span>`).join('')}
        </div>
        <h3 class="gradient-text">${project.title}</h3>
        <p>${project.desc}</p>
        
        ${hasLinks ? `
          <div class="project-links">
            ${hasDemo ? `<a href="${project.links.demo}" class="link-btn" target="_blank" rel="noopener">VIEW CASE<span>→</span></a>` : ''}
            ${hasGithub ? `<a href="${project.links.github}" class="link-github" target="_blank" rel="noopener">GITHUB</a>` : ''}
          </div>
        ` : ''}
      </div>
    `;
    grid.appendChild(card);
  });
}

function getSkillIcon(iconName) {
  const icons = {
    brain: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2c1.5 0 2.8.7 3.6 1.8.5-.1 1-.2 1.4-.2 2.6 0 4.7 2.1 4.7 4.7 0 .8-.2 1.6-.6 2.3.4.8.6 1.6.6 2.5 0 2.1-1.1 3.9-2.8 4.9.1.4.1.8.1 1.2 0 2.6-2.1 4.8-4.8 4.8-.9 0-1.8-.3-2.5-.7-.7.5-1.5.7-2.4.7-2.6 0-4.8-2.1-4.8-4.8 0-.4 0-.8.1-1.2C3.1 14.8 2 13 2 10.9c0-.9.2-1.7.6-2.5-.4-.7-.6-1.5-.6-2.3C2 3.5 4.1 1.4 6.7 1.4c.5 0 1 .1 1.4.2C9 .5 10.4 0 12 2z"/>
      <path d="M12 2v20"/>
      <path d="M8 6c-1 .5-2 1.5-2 3"/>
      <path d="M16 6c1 .5 2 1.5 2 3"/>
    </svg>`,
    code: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>`,
    tool: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72z"/>
      <path d="m14 7 3 3"/>
      <path d="M5 6v4"/>
      <path d="M19 14v4"/>
      <path d="M10 2v2"/>
      <path d="M7 8H3"/>
      <path d="M21 16h-4"/>
      <path d="M11 3H9"/>
    </svg>`,
  };
  return icons[iconName] || icons.code;
}

function renderSkills() {
  const container = document.querySelector('.skills-container');
  if (!container) return;
  container.innerHTML = '';

  skillGroups.forEach((group, i) => {
    const card = document.createElement('div');
    card.className = 'skill-group';
    card.style.animationDelay = `${i * 0.12}s`;

    card.innerHTML = `
      <div class="skill-group-header">
        <span class="skill-icon">${getSkillIcon(group.icon)}</span>
        <h3>${group.title}</h3>
      </div>
      <div class="skill-chips">
        ${group.skills.map(s => `<span class="skill-chip">${s}</span>`).join('')}
      </div>
    `;
    container.appendChild(card);
  });
}

function renderContact() {
  const section = document.querySelector('#contact');
  if (!section) return;

  const ctaBtn = section.querySelector('.cta-btn');
  if (ctaBtn) {
    ctaBtn.href = `mailto:${social.email}`;
    ctaBtn.textContent = contact.cta;
  }

  const subtitle = section.querySelector('.contact-subtitle');
  if (subtitle) subtitle.textContent = contact.subtitle;
}

function renderFooter() {
  const footerEl = document.querySelector('#footer');
  if (!footerEl) return;

  const linksContainer = footerEl.querySelector('.footer-links');
  if (linksContainer) {
    linksContainer.innerHTML = '';

    if (social.github) {
      linksContainer.appendChild(createSocialLink(
        social.github,
        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
        'GitHub',
        true
      ));
    }

    if (social.email) {
      linksContainer.appendChild(createSocialLink(
        `mailto:${social.email}`,
        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
        'Email',
        false
      ));
    }

    if (social.linkedin) {
      linksContainer.appendChild(createSocialLink(
        social.linkedin,
        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`,
        'LinkedIn',
        true
      ));
    }
  }

  const copy = footerEl.querySelector('.footer-copy');
  if (copy) copy.textContent = footer.copyright;
}

function createSocialLink(href, svgIcon, label, external) {
  const a = document.createElement('a');
  a.href = href;
  if (external) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  a.innerHTML = `${svgIcon}<span>${label}</span>`;
  return a;
}
