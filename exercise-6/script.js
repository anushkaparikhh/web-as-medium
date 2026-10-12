const button = document.getElementById('button');
  const classes = button.classList;
  let lastX = 0;

  button.addEventListener('click', () => {
    const result = classes.toggle('on');
    button.textContent = result ? 'ON' : 'OFF';

    if (!result) {
      // return to its original spot in the layout
      button.style.left = '';
      button.style.top = '';
      button.style.transform = '';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (classes.contains('on')) {
      const skew = Math.max(-45, Math.min(45, e.clientX - lastX));
      button.style.left = e.clientX + 'px';
      button.style.top = e.clientY + 'px';
      button.style.transform = `translate(-50%, -50%) skewX(${-skew}deg)`;
    }
    lastX = e.clientX;
  });