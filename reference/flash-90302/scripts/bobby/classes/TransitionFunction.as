package bobby.classes
{
   public class TransitionFunction extends TransitionBase
   {
      
      private var targetFunction:Function;
      
      public function TransitionFunction(param1:Function, param2:Number, param3:Number, param4:Number)
      {
         super(param2,param3,param4);
         this.targetFunction = param1;
      }
      
      override public function doSomething() : void
      {
         super.doSomething();
         this.targetFunction.call();
      }
   }
}

