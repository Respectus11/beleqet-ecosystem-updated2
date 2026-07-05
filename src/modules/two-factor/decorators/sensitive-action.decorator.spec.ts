import { SENSITIVE_ACTION_KEY, SensitiveAction } from './sensitive-action.decorator';

describe('SensitiveAction decorator', () => {
  it('should define SENSITIVE_ACTION_KEY', () => {
    expect(SENSITIVE_ACTION_KEY).toBe('sensitive_action');
  });

  it('should set metadata key to true when applied as method decorator', () => {
    class TestController {
      @SensitiveAction()
      sensitiveMethod() {
        return true;
      }

      normalMethod() {
        return true;
      }
    }

    const instance = new TestController();
    const sensitiveMetadata = Reflect.getMetadata(SENSITIVE_ACTION_KEY, instance.sensitiveMethod);
    expect(sensitiveMetadata).toBe(true);

    const normalMetadata = Reflect.getMetadata(SENSITIVE_ACTION_KEY, instance.normalMethod);
    expect(normalMetadata).toBeUndefined();
  });
});
