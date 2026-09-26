import {type Web} from '@e2edev/web'

/**
 * Makes every file input in the page pick a generated PNG instead of opening
 * the operating system's file dialog, which no browser automation can drive.
 * The web picker (`expo-image-picker`) creates a hidden input and opens it by
 * dispatching a synthetic click, so both `click()` and `dispatchEvent(click)`
 * on a file input answer with a file and a change event.
 * Call it after `bsky.open`; it lives until the next full page load.
 */
export async function stubWebFilePicker(web: Web): Promise<void> {
  await web.evaluate(() => {
    // a member assignment, not a const: the runner's TypeScript loader wraps named
    // functions in a __name helper that does not exist inside the page
    const stub: {pick?: (input: HTMLInputElement) => void} = {}
    stub.pick = input => {
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas 2d context unavailable')
      context.fillStyle = '#1185fe'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = '#ffffff'
      context.font = 'bold 96px sans-serif'
      context.fillText('e2e', 230, 275)
      canvas.toBlob(blob => {
        if (!blob) throw new Error('canvas produced no image')
        const transfer = new DataTransfer()
        transfer.items.add(
          new File([blob], 'e2e-photo.png', {type: 'image/png'}),
        )
        input.files = transfer.files
        input.dispatchEvent(new Event('change', {bubbles: true}))
      }, 'image/png')
    }

    const originalClick = HTMLInputElement.prototype.click
    HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
      if (this.type === 'file') stub.pick?.(this)
      else originalClick.call(this)
    }

    const originalDispatchEvent = HTMLInputElement.prototype.dispatchEvent
    HTMLInputElement.prototype.dispatchEvent = function (
      this: HTMLInputElement,
      event: Event,
    ) {
      if (this.type === 'file' && event.type === 'click') {
        stub.pick?.(this)
        return true
      }
      return originalDispatchEvent.call(this, event)
    }
    return null
  })
}
